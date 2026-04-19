import { describe, expect, it } from 'vitest';
import type { MySqlQueryResult } from '../../src/lib/daos/shared/MySqlPoolWrapper';
import { MySqlDAO, MySqlSqlBinder } from '../../src/lib/daos/shared/MySqlDAO';

type QueryCall = {
    text: string;
    values: unknown[];
};

class MockMySqlDAO extends MySqlDAO
{
    async runSql(sql: string, params?: unknown[] | Record<string, unknown>): Promise<number>
    {
        return this.run(sql, params);
    }

    async getRow<T extends Record<string, unknown>>(
        sql: string,
        params?: unknown[] | Record<string, unknown>
    ): Promise<T | undefined>
    {
        return this.getOne<T>(sql, params);
    }

    async allRows<T extends Record<string, unknown>>(
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

    async query<T extends Record<string, unknown>>(text: string, values: unknown[]): Promise<MySqlQueryResult<T>>
    {
        this.calls.push({ text, values });

        return {
            affectedRows: 2,
            insertId: 0,
            rows: [
                { id: 1, name: 'first' },
                { id: 2, name: 'second' }
            ] as unknown as T[],
        };
    }
}

describe('MySqlSqlBinder', () => {
    it('leaves positional question placeholders unchanged', () => {
        const boundSql = MySqlSqlBinder.bind(
            `SELECT * FROM videos WHERE channel_id = ? AND title <> '?' AND id > ?`,
            [10, 20]
        );

        expect(boundSql).toEqual({
            text: `SELECT * FROM videos WHERE channel_id = ? AND title <> '?' AND id > ?`,
            values: [10, 20],
        });
    });

    it('converts named placeholders and duplicates repeated values', () => {
        const boundSql = MySqlSqlBinder.bind(
            `SELECT :id AS id WHERE owner_id = :id AND name = :name AND note = ':name'`,
            {
                id: 42,
                name: 'demo',
            }
        );

        expect(boundSql).toEqual({
            text: `SELECT ? AS id WHERE owner_id = ? AND name = ? AND note = ':name'`,
            values: [42, 42, 'demo'],
        });
    });

    it('throws when a named placeholder has no value', () => {
        expect(() => MySqlSqlBinder.bind(
            `SELECT * FROM videos WHERE id = :id`,
            {}
        )).toThrow('Missing SQL parameter ":id".');
    });
});

describe('MySqlDAO', () => {
    it('runs statements through the shared parameter binder', async () => {
        const provider = new MockQueryProvider();
        const dao = new MockMySqlDAO(provider as never);

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
                text: `UPDATE videos SET title = ? WHERE id = ?`,
                values: ['Updated', 12],
            }
        ]);
    });

    it('maps first-row and all-row query results', async () => {
        const provider = new MockQueryProvider();
        const dao = new MockMySqlDAO(provider as never);

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
