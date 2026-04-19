import { describe, expect, it } from 'vitest';
import { MYSQL_CREATE_TABLE_META } from '../../src/lib/daos/_schema';
import type { AsyncMigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import type { MySqlQueryResult } from '../../src/lib/daos/shared/MySqlPoolWrapper';
import { runCreateDatabaseWorkflow } from '../../scripts/create_database';
import { runMigrationWorkflow } from '../../scripts/migrate_database';

type QueryCall = {
    sql: string;
    params?: unknown[];
};

function createQueryResult<T extends object>(rows: T[]): MySqlQueryResult<T>
{
    return {
        rows,
        affectedRows: rows.length,
        insertId: 0,
    };
}

class MockMySqlClient
{
    readonly calls: QueryCall[] = [];

    async query<T extends object = Record<string, unknown>>(
        sql: string,
        params?: unknown[]
    ): Promise<MySqlQueryResult<T>>
    {
        this.calls.push({ sql, params });

        if (sql.includes('SELECT value FROM _meta')) {
            return createQueryResult([{ value: '7' }] as T[]);
        }

        if (sql.includes('information_schema.tables')) {
            return createQueryResult([] as T[]);
        }

        return createQueryResult([] as T[]);
    }
}

function createProvider(client: MockMySqlClient)
{
    return {
        query: client.query.bind(client),
    };
}

describe('database setup scripts', () => {
    it('bootstraps the latest MySQL schema without SQLite file operations', async () => {
        const client = new MockMySqlClient();

        await runCreateDatabaseWorkflow({
            pool: createProvider(client),
        });

        expect(client.calls[0].sql).toBe('START TRANSACTION');
        expect(client.calls.some((call) => MYSQL_CREATE_TABLE_META.includes(call.sql))).toBe(true);
        expect(client.calls.at(-1)?.sql).toBe('COMMIT');
    });

    it('runs registered MySQL migrations without SQLite file operations', async () => {
        const client = new MockMySqlClient();

        const result = await runMigrationWorkflow({
            pool: createProvider(client),
        });

        expect(result.currentVersion).toBe(7);
        expect(result.targetVersion).toBe(8);
        expect(result.finalVersion).toBe(8);
        expect(result.appliedMigrations).toEqual([
            {
                version: 8,
                name: 'add_migration_history',
            }
        ]);
        expect(client.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.sql)).toContain('COMMIT');
        expect(client.calls.some((call) => call.sql.includes('INSERT INTO migration_history'))).toBe(true);
    });

    it('rolls back failed MySQL setup migrations', async () => {
        const client = new MockMySqlClient();
        const failingMigrations: AsyncMigrationDefinition[] = [
            {
                version: 8,
                name: 'broken_migration',
                async apply() {
                    throw new Error('forced migration failure');
                }
            }
        ];

        await expect(runMigrationWorkflow({
            pool: createProvider(client),
            migrations: failingMigrations,
        })).rejects.toThrow('forced migration failure');

        expect(client.calls.map((call) => call.sql)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.sql)).toContain('ROLLBACK');
        expect(client.calls.map((call) => call.sql)).not.toContain('COMMIT');
    });
});
// apply-patch-anchor - do not delete
