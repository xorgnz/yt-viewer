import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '$lib/daos/migration/migrations/registry';
import { DatabaseMigrationAdapter } from '$lib/daos/migration/MigrationAdapter';
import { MigrationRunner } from '$lib/daos/migration/MigrationRunner';

type QueryCall = {
    sql: string;
    params?: unknown[];
};

class MockMigrationProvider
{
    readonly calls: QueryCall[] = [];
    private readonly schemaVersion: string;
    private readonly historyTableExists: boolean;
    private readonly migrationRows: Array<{ version: number; name: string; success: boolean | number }>;

    constructor(options?: {
        schemaVersion?: string;
        historyTableExists?: boolean;
        migrationRows?: Array<{ version: number; name: string; success: boolean | number }>;
    })
    {
        this.schemaVersion = options?.schemaVersion ?? '7';
        this.historyTableExists = options?.historyTableExists ?? false;
        this.migrationRows = options?.migrationRows ?? [];
    }

    async query<T extends Record<string, unknown>>(sql: string, params?: unknown[])
    {
        this.calls.push({ sql, params });

        if (sql.includes('SELECT value FROM _meta')) {
            return {
                rows: [{ value: this.schemaVersion }] as unknown as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        if (sql.includes('information_schema.tables')) {
            return {
                rows: this.historyTableExists ? [{ table_name: 'migration_history' }] as unknown as T[] : [] as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        if (sql.includes('FROM migration_history')) {
            return {
                rows: this.migrationRows as unknown as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        return {
            rows: [] as T[],
            affectedRows: 0,
            insertId: 0
        };
    }
}

class MockTransactionalMigrationProvider extends MockMigrationProvider
{
    readonly poolCalls: QueryCall[] = [];
    readonly connectionCalls: QueryCall[] = [];

    async query<T extends Record<string, unknown>>(sql: string, params?: unknown[])
    {
        this.poolCalls.push({ sql, params });
        return super.query<T>(sql, params);
    }

    async withConnection<T>(work: (connection: {
        execute<TResult>(sql: string, params?: unknown[]): Promise<[TResult]>;
        release(): void;
    }) => Promise<T> | T): Promise<T>
    {
        const connection = {
            execute: async <TResult>(sql: string, params: unknown[] = []) => {
                this.connectionCalls.push({ sql, params });

                const result = await super.query<Record<string, unknown>>(sql, params);
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

describe('MigrationRunner', () => {
    it('returns the current version when the schema is already at the latest version', async () => {
        const provider = new MockMigrationProvider({
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
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 11,
            targetVersion: 11,
            appliedMigrations: [],
            finalVersion: 11,
        });
        expect(provider.calls.map((call) => call.sql)).not.toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).not.toContain('COMMIT');
    });

    it('accepts legacy migration rows when the schema is already at version 10', async () => {
        const provider = new MockMigrationProvider({
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
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 11,
            targetVersion: 11,
            appliedMigrations: [],
            finalVersion: 11,
        });
    });

    it('rolls back a failed MySQL migration transaction', async () => {
        const provider = new MockMigrationProvider();
        const migrations = [
            {
                version: 8,
                name: 'broken_migration',
                async apply() {
                    throw new Error('migration failed');
                },
            }
        ];
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), migrations);

        await expect(runner.runToLatest()).rejects.toThrow('migration failed');

        expect(provider.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).toContain('ROLLBACK');
        expect(provider.calls.map((call) => call.sql)).not.toContain('COMMIT');
    });

    it('runs explicit migration when provided', async () => {
        const provider = new MockMigrationProvider({
            schemaVersion: '8',
            historyTableExists: false,
            migrationRows: [],
        });
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), [
            {
                version: 9,
                name: 'add_virtual_channel_daily_timer_max',
                async apply() {
                    return;
                },
            }
        ]);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 8,
            targetVersion: 9,
            appliedMigrations: [
                {
                    version: 9,
                    name: 'add_virtual_channel_daily_timer_max',
                }
            ],
            finalVersion: 9,
        });
    });

    it('runs the registered extra timer and profile split-timer migrations from version 9 to 11', async () => {
        const provider = new MockMigrationProvider({
            schemaVersion: '9',
            historyTableExists: true,
            migrationRows: [],
        });
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 9,
            targetVersion: 11,
            appliedMigrations: [
                {
                    version: 10,
                    name: 'add_virtual_channel_extra_timer_seconds_remaining',
                },
                {
                    version: 11,
                    name: 'add_profile_split_timer_mode_enabled',
                }
            ],
            finalVersion: 11,
        });
        expect(provider.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).toContain('COMMIT');
        expect(provider.calls.some((call) => call.sql.includes('ALTER TABLE virtual_channels'))).toBe(true);
        expect(provider.calls.some((call) => call.sql.includes('ALTER TABLE profiles'))).toBe(true);
    });

    it('accepts legacy migration history when migrating from version 9 to 11', async () => {
        const provider = new MockMigrationProvider({
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
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0]), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 9,
            targetVersion: 11,
            appliedMigrations: [
                {
                    version: 10,
                    name: 'add_virtual_channel_extra_timer_seconds_remaining',
                },
                {
                    version: 11,
                    name: 'add_profile_split_timer_mode_enabled',
                }
            ],
            finalVersion: 11,
        });
    });

    it('pins transaction-scoped migration writes to a single connection', async () => {
        const provider = new MockTransactionalMigrationProvider({
            schemaVersion: '9',
            historyTableExists: true,
            migrationRows: [],
        });
        const runner = new MigrationRunner(
            new DatabaseMigrationAdapter(
                provider.query.bind(provider) as ConstructorParameters<typeof DatabaseMigrationAdapter>[0],
                provider.withConnection.bind(provider) as never
            ),
            MIGRATIONS
        );

        const result = await runner.runToLatest();

        expect(result.finalVersion).toBe(11);
        expect(provider.connectionCalls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(provider.connectionCalls.map((call) => call.sql)).toContain('COMMIT');
        expect(provider.connectionCalls.some((call) => call.sql.includes('ALTER TABLE virtual_channels'))).toBe(true);
        expect(provider.connectionCalls.some((call) => call.sql.includes('ALTER TABLE profiles'))).toBe(true);
        expect(provider.connectionCalls.some((call) => call.sql.includes('INSERT INTO migration_history'))).toBe(true);
        expect(provider.connectionCalls.some((call) => call.sql.includes('INSERT INTO _meta'))).toBe(true);
        expect(provider.poolCalls.map((call) => call.sql)).not.toContain('START TRANSACTION');
        expect(provider.poolCalls.map((call) => call.sql)).not.toContain('COMMIT');
        expect(provider.poolCalls.map((call) => call.sql)).not.toContain('ROLLBACK');
    });
});
// apply-patch-anchor - do not delete
