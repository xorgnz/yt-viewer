import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';
import { POSTGRES_CREATE_TABLE_META } from '../../src/lib/daos/_schema';
import type { AsyncMigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import { runCreateDatabaseWorkflow } from '../../scripts/create_database';
import { runMigrationWorkflow } from '../../scripts/migrate_database';

type QueryCall = {
    sql: string;
    params?: unknown[];
};

function createQueryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T>
{
    return {
        command: 'SELECT',
        rowCount: rows.length,
        oid: 0,
        fields: [],
        rows,
    };
}

class MockPostgresClient
{
    readonly calls: QueryCall[] = [];

    async query(sql: string, params?: unknown[]): Promise<QueryResult>
    {
        this.calls.push({ sql, params });

        if (sql.includes('SELECT value FROM _meta')) {
            return createQueryResult([{ value: '7' }]);
        }

        if (sql.includes('information_schema.tables')) {
            return createQueryResult([]);
        }

        return createQueryResult([]);
    }
}

function createProvider(client: MockPostgresClient)
{
    return {
        withClient: async <T>(work: (client: PoolClient) => Promise<T> | T): Promise<T> => {
            return work(client as unknown as PoolClient);
        }
    };
}

describe('database setup scripts', () => {
    it('bootstraps the latest Postgres schema without SQLite file operations', async () => {
        const client = new MockPostgresClient();

        await runCreateDatabaseWorkflow({
            pool: createProvider(client),
        });

        expect(client.calls[0].sql).toBe('BEGIN');
        expect(client.calls.some((call) => call.sql === POSTGRES_CREATE_TABLE_META)).toBe(true);
        expect(client.calls.at(-1)?.sql).toBe('COMMIT');
    });

    it('runs registered Postgres migrations without SQLite file operations', async () => {
        const client = new MockPostgresClient();

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
        expect(client.calls.map((call) => call.sql)).toContain('BEGIN');
        expect(client.calls.map((call) => call.sql)).toContain('COMMIT');
        expect(client.calls.some((call) => call.sql.includes('INSERT INTO migration_history'))).toBe(true);
    });

    it('rolls back failed Postgres setup migrations', async () => {
        const client = new MockPostgresClient();
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

        expect(client.calls.map((call) => call.sql)).toContain('BEGIN');
        expect(client.calls.map((call) => call.sql)).toContain('ROLLBACK');
        expect(client.calls.map((call) => call.sql)).not.toContain('COMMIT');
    });
});
// apply-patch-anchor - do not delete