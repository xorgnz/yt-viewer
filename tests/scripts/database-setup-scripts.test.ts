import { describe, expect, it } from 'vitest';
import { CREATE_TABLE_META, SCHEMA_VERSION } from '../../src/lib/daos/_schema';
import { runCreateDatabaseWorkflow } from '../../scripts/create_database';
import { runMigrationWorkflow } from '../../scripts/migrate_database';
import { MockQueryProvider } from '../helpers/MockQueryProvider';
import type {MigrationDefinition} from "$lib/daos/migration/migrations/registry";

function createProvider(options?: {
    schemaVersion?: string;
    historyTableExists?: boolean;
    migrationRows?: Array<{ version: number; name: string; success: boolean | number }>;
}): MockQueryProvider
{
    const schemaVersion = options?.schemaVersion ?? '11';
    const historyTableExists = options?.historyTableExists ?? false;
    const migrationRows = options?.migrationRows ?? [];

    return new MockQueryProvider((sql) => {
        if (sql.includes('SELECT value FROM _meta')) {
            return MockQueryProvider.result([{ value: schemaVersion }]);
        }

        if (sql.includes('information_schema.tables')) {
            return MockQueryProvider.result(
                historyTableExists ? [{ table_name: 'migration_history' }] : []
            );
        }

        if (sql.includes('FROM migration_history')) {
            return MockQueryProvider.result(migrationRows);
        }

        return undefined;
    });
}

class MockTransactionalQueryProvider extends MockQueryProvider
{
    readonly poolCalls: Array<{ text: string; values: unknown[] }> = [];
    readonly connectionCalls: Array<{ text: string; values: unknown[] }> = [];

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values: unknown[] = []
    )
    {
        this.poolCalls.push({ text, values });
        return await super.query<T>(text, values);
    }

    async withConnection<T>(work: (connection: {
        execute<TResult>(text: string, values?: unknown[]): Promise<[TResult]>;
        release(): void;
    }) => Promise<T> | T): Promise<T>
    {
        const connection = {
            execute: async <TResult>(text: string, values: unknown[] = []) => {
                this.connectionCalls.push({ text, values });

                const result = await super.query<Record<string, unknown>>(text, values);
                if (result.rows.length > 0) {
                    return [result.rows as TResult] as [TResult];
                }

                return [{
                    affectedRows: result.affectedRows,
                    insertId: result.insertId
                } as TResult] as [TResult];
            },
            release() {
                return;
            }
        };

        return await work(connection);
    }
}

describe('database setup scripts', () => {
    it('bootstraps the latest database schema', async () => {
        const client = createProvider();

        await runCreateDatabaseWorkflow({
            pool: client,
        });

        const sqlCalls = client.calls.map((call) => call.text);

        expect(client.calls[0].text).toBe('START TRANSACTION');
        expect(client.calls.some((call) => CREATE_TABLE_META.includes(call.text))).toBe(true);
        expect(sqlCalls).not.toContain('DROP TABLE IF EXISTS watch_history');
        expect(sqlCalls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS source_channels'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('src_channel_id VARCHAR(255) NOT NULL'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('PRIMARY KEY (src_channel_id)'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS virtual_channels'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('extra_timer_seconds_remaining INT NOT NULL DEFAULT 0'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('split_timer_mode_enabled TINYINT NOT NULL DEFAULT 1'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS videos'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('video_id VARCHAR(255) NOT NULL'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('FOREIGN KEY (src_channel_id) REFERENCES source_channels(src_channel_id) ON DELETE CASCADE ON UPDATE CASCADE'))).toBe(true);
        expect(sqlCalls.some((sql) => sql.includes('INSERT INTO _meta(`key`, value) VALUES(\'schema_version\', ?)'))).toBe(true);
        expect(client.calls.at(-2)?.values).toEqual([String(SCHEMA_VERSION)]);
        expect(client.calls.at(-1)?.text).toBe('COMMIT');
    });

    it('pins bootstrap writes to a single connection when available', async () => {
        const client = new MockTransactionalQueryProvider();

        await runCreateDatabaseWorkflow({
            pool: client,
        });

        expect(client.connectionCalls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.connectionCalls.map((call) => call.text)).toContain('COMMIT');
        expect(client.connectionCalls.some((call) => call.text.includes('CREATE TABLE IF NOT EXISTS virtual_channels'))).toBe(true);
        expect(client.connectionCalls.some((call) => call.text.includes('INSERT INTO _meta'))).toBe(true);
        expect(client.poolCalls.map((call) => call.text)).not.toContain('START TRANSACTION');
        expect(client.poolCalls.map((call) => call.text)).not.toContain('COMMIT');
    });

    it('runs registered database migration', async () => {
        const client = createProvider({
            schemaVersion: '11',
            historyTableExists: true,
            migrationRows: [
                {
                    version: 10,
                    name: 'add_virtual_channel_extra_timer_seconds_remaining',
                    success: 1,
                },
                {
                    version: 11,
                    name: 'add_profile_split_timer_mode_enabled',
                    success: 1,
                }
            ],
        });

        const result = await runMigrationWorkflow(client);

        expect(result.currentVersion).toBe(11);
        expect(result.targetVersion).toBe(11);
        expect(result.finalVersion).toBe(11);
        expect(result.appliedMigrations).toEqual([]);
        expect(client.calls.map((call) => call.text)).not.toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).not.toContain('COMMIT');
        expect(client.calls.some((call) => call.text.includes('INSERT INTO migration_history'))).toBe(false);
    });

    it('accepts legacy migration rows when the schema is already at version 10', async () => {
        const client = createProvider({
            schemaVersion: '11',
            historyTableExists: true,
            migrationRows: [
                {
                    version: 8,
                    name: 'add_migration_history',
                    success: 1,
                },
                {
                    version: 9,
                    name: 'add_virtual_channel_daily_timer_max',
                    success: 1,
                },
                {
                    version: 10,
                    name: 'add_virtual_channel_extra_timer_seconds_remaining',
                    success: 1,
                },
                {
                    version: 11,
                    name: 'add_profile_split_timer_mode_enabled',
                    success: 1,
                }
            ],
        });

        const result = await runMigrationWorkflow(client);

        expect(result.currentVersion).toBe(11);
        expect(result.targetVersion).toBe(11);
        expect(result.finalVersion).toBe(11);
        expect(result.appliedMigrations).toEqual([]);
        expect(client.calls.map((call) => call.text)).not.toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).not.toContain('COMMIT');
    });

    it('applies the registered extra timer and profile split-timer migrations from version 9 to 11', async () => {
        const client = createProvider({
            schemaVersion: '9',
            historyTableExists: true,
            migrationRows: [],
        });

        const result = await runMigrationWorkflow(client);

        expect(result.currentVersion).toBe(9);
        expect(result.targetVersion).toBe(11);
        expect(result.finalVersion).toBe(11);
        expect(result.appliedMigrations).toEqual([
            {
                version: 10,
                name: 'add_virtual_channel_extra_timer_seconds_remaining',
            },
            {
                version: 11,
                name: 'add_profile_split_timer_mode_enabled',
            }
        ]);
        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('COMMIT');
        expect(client.calls.some((call) => call.text.includes('ALTER TABLE virtual_channels'))).toBe(true);
        expect(client.calls.some((call) => call.text.includes('ALTER TABLE profiles'))).toBe(true);
        expect(client.calls.some((call) => call.text.includes('INSERT INTO migration_history'))).toBe(true);
    });

    it('accepts legacy migration history when applying the version 9 to 11 migrations', async () => {
        const client = createProvider({
            schemaVersion: '9',
            historyTableExists: true,
            migrationRows: [
                {
                    version: 8,
                    name: 'add_migration_history',
                    success: 1,
                },
                {
                    version: 9,
                    name: 'add_virtual_channel_daily_timer_max',
                    success: 1,
                }
            ],
        });

        const result = await runMigrationWorkflow(client);

        expect(result.currentVersion).toBe(9);
        expect(result.targetVersion).toBe(11);
        expect(result.finalVersion).toBe(11);
        expect(result.appliedMigrations).toEqual([
            {
                version: 10,
                name: 'add_virtual_channel_extra_timer_seconds_remaining',
            },
            {
                version: 11,
                name: 'add_profile_split_timer_mode_enabled',
            }
        ]);
        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('COMMIT');
    });

    it('rolls back failed MySQL setup migration', async () => {
        const client = createProvider({
            schemaVersion: '7',
        });
        const failingMigrations: MigrationDefinition[] = [
            {
                version: 8,
                name: 'broken_migration',
                async apply() {
                    throw new Error('forced migration failure');
                }
            }
        ];

        await expect(runMigrationWorkflow(
            client,
            failingMigrations
        )).rejects.toThrow('forced migration failure');

        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('ROLLBACK');
        expect(client.calls.map((call) => call.text)).not.toContain('COMMIT');
    });
});
// apply-patch-anchor - do not delete
