import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../../src/lib/daos/migrations/registry';
import { DatabaseMigrationAdapter } from '../../src/lib/daos/shared/MigrationAdapter';
import { MigrationRunner } from '../../src/lib/daos/shared/MigrationRunner';

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

describe('MigrationRunner', () => {
    it('returns the current version when no migrations are registered', async () => {
        const provider = new MockMigrationProvider({
            schemaVersion: '9',
        });
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider as never), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 9,
            targetVersion: 9,
            appliedMigrations: [],
            finalVersion: 9,
        });
        expect(provider.calls.map((call) => call.sql)).not.toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).not.toContain('COMMIT');
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
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider as never), migrations);

        await expect(runner.runToLatest()).rejects.toThrow('migration failed');

        expect(provider.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).toContain('ROLLBACK');
        expect(provider.calls.map((call) => call.sql)).not.toContain('COMMIT');
    });

    it('runs explicit migrations when provided', async () => {
        const provider = new MockMigrationProvider({
            schemaVersion: '8',
            historyTableExists: false,
            migrationRows: [],
        });
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider as never), [
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
});
// apply-patch-anchor - do not delete
