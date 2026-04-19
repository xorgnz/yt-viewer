import { describe, expect, it } from 'vitest';
import { CREATE_TABLE_MIGRATION_HISTORY } from '../../src/lib/daos/_schema';
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

    async query<T extends Record<string, unknown>>(sql: string, params?: unknown[])
    {
        this.calls.push({ sql, params });

        if (sql.includes('SELECT value FROM _meta')) {
            return {
                rows: [{ value: '7' }] as unknown as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        if (sql.includes('information_schema.tables')) {
            return {
                rows: [] as T[],
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
    it('runs pending MySQL migrations in a transaction with schema metadata updates', async () => {
        const provider = new MockMigrationProvider();
        const runner = new MigrationRunner(new DatabaseMigrationAdapter(provider as never), MIGRATIONS);

        const result = await runner.runToLatest();

        expect(result).toEqual({
            currentVersion: 7,
            targetVersion: 8,
            appliedMigrations: [
                {
                    version: 8,
                    name: 'add_migration_history',
                }
            ],
            finalVersion: 8,
        });
        expect(provider.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(provider.calls.map((call) => call.sql)).toContain('COMMIT');
        expect(provider.calls.some((call) => CREATE_TABLE_MIGRATION_HISTORY.includes(call.sql))).toBe(true);
        expect(provider.calls.some((call) => call.sql.includes('INSERT INTO migration_history'))).toBe(true);
        expect(provider.calls.some((call) => call.sql.includes('ON DUPLICATE KEY UPDATE value=VALUES(value)'))).toBe(true);
        expect(provider.calls.some((call) => call.params?.[0] === '8')).toBe(true);
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
});
// apply-patch-anchor - do not delete
