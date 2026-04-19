import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';
import { PostgresDAO, PostgresSqlBinder } from '../../src/lib/daos/shared/PostgresDAO';

type QueryCall = {
    text: string;
    values: unknown[];
};

class MockPostgresDAO extends PostgresDAO
{
    async runSql(sql: string, params?: unknown[] | Record<string, unknown>): Promise<number>
    {
        return this.run(sql, params);
    }

    async getRow<T extends QueryResultRow>(
        sql: string,
        params?: unknown[] | Record<string, unknown>
    ): Promise<T | undefined>
    {
        return this.getOne<T>(sql, params);
    }

    async allRows<T extends QueryResultRow>(
        sql: string,
        params?: unknown[] | Record<string, unknown>
    ): Promise<T[]>
    {
        return this.listRows<T>(sql, params);
    }
}

class MockQueryProvider
{
    readonly calls: QueryCall[] = [];

    async query<T extends QueryResultRow>(text: string, values: unknown[]): Promise<QueryResult<T>>
    {
        this.calls.push({ text, values });

        return {
            command: 'SELECT',
            rowCount: 2,
            oid: 0,
            fields: [],
            rows: [
                { id: 1, name: 'first' },
                { id: 2, name: 'second' }
            ] as unknown as T[],
        };
    }
}

describe('PostgresSqlBinder', () => {
    it('converts positional question placeholders to Postgres placeholders', () => {
        const boundSql = PostgresSqlBinder.bind(
            `SELECT * FROM videos WHERE channel_id = ? AND title <> '?' AND id > ?`,
            [10, 20]
        );

        expect(boundSql).toEqual({
            text: `SELECT * FROM videos WHERE channel_id = $1 AND title <> '?' AND id > $2`,
            values: [10, 20],
        });
    });

    it('converts named placeholders and reuses duplicate parameter positions', () => {
        const boundSql = PostgresSqlBinder.bind(
            `SELECT :id::int AS id WHERE owner_id = :id AND name = :name AND note = ':name'`,
            {
                id: 42,
                name: 'demo',
            }
        );

        expect(boundSql).toEqual({
            text: `SELECT $1::int AS id WHERE owner_id = $1 AND name = $2 AND note = ':name'`,
            values: [42, 'demo'],
        });
    });

    it('throws when a named placeholder has no value', () => {
        expect(() => PostgresSqlBinder.bind(
            `SELECT * FROM videos WHERE id = :id`,
            {}
        )).toThrow('Missing SQL parameter ":id".');
    });
});

describe('PostgresDAO', () => {
    it('runs statements through the shared parameter binder', async () => {
        const provider = new MockQueryProvider();
        const dao = new MockPostgresDAO(provider);

        const rowCount = await dao.runSql(
            `UPDATE videos SET title = :title WHERE id = :id`,
            {
                id: 12,
                title: 'Updated',
            }
        );

        expect(rowCount).toBe(2);
        expect(provider.calls).toEqual([
            {
                text: `UPDATE videos SET title = $1 WHERE id = $2`,
                values: ['Updated', 12],
            }
        ]);
    });

    it('maps first-row and all-row query results', async () => {
        const provider = new MockQueryProvider();
        const dao = new MockPostgresDAO(provider);

        await expect(dao.getRow<{ id: number; name: string }>(
            `SELECT * FROM profiles WHERE id = ?`,
            [1]
        )).resolves.toEqual({ id: 1, name: 'first' });

        await expect(dao.allRows<{ id: number; name: string }>(
            `SELECT * FROM profiles ORDER BY id`
        )).resolves.toEqual([
            { id: 1, name: 'first' },
            { id: 2, name: 'second' }
        ]);
    });
});
// apply-patch-anchor - do not delete