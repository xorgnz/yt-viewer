import type { DatabasePool, DatabaseQueryResult } from '$lib/daos/shared/DatabasePool';

export type SqlParams = unknown[] | Record<string, unknown>;

export type BoundSql = {
    text: string;
    values: unknown[];
};

type QueryProvider = Pick<DatabasePool, 'query'>;

export class SqlBinder
{
    static bind(sql: string, params?: SqlParams): BoundSql
    {
        if (!params) {
            return {
                text: sql,
                values: [],
            };
        }

        if (Array.isArray(params)) {
            return {
                text: sql,
                values: params,
            };
        }

        return SqlBinder.convertNamedPlaceholders(sql, params);
    }

    private static convertNamedPlaceholders(
        sql: string,
        params: Record<string, unknown>
    ): BoundSql
    {
        const values: unknown[] = [];
        let output = '';

        for (let index = 0; index < sql.length; index++) {
            const char = sql[index];
            const previousChar = sql[index - 1];
            const nextChar = sql[index + 1];

            if (char === '\'' || char === '"' || char === '`') {
                const quoted = SqlBinder.readQuotedText(sql, index, char);
                output += quoted.value;
                index = quoted.endIndex;
                continue;
            }

            if (
                char !== ':'
                || previousChar === ':'
                || nextChar === ':'
                || !SqlBinder.isIdentifierStart(nextChar)
            ) {
                output += char;
                continue;
            }

            const nameStart = index + 1;
            let nameEnd = nameStart + 1;

            while (SqlBinder.isIdentifierPart(sql[nameEnd])) {
                nameEnd += 1;
            }

            const name = sql.slice(nameStart, nameEnd);

            if (!Object.prototype.hasOwnProperty.call(params, name)) {
                throw new Error(`Missing SQL parameter ":${name}".`);
            }

            values.push(params[name]);
            output += '?';
            index = nameEnd - 1;
        }

        return {
            text: output,
            values,
        };
    }

    private static readQuotedText(
        sql: string,
        startIndex: number,
        quote: string
    ): { value: string; endIndex: number }
    {
        let value = quote;

        for (let index = startIndex + 1; index < sql.length; index++) {
            const char = sql[index];
            value += char;

            if (char !== quote) {
                continue;
            }

            if (sql[index + 1] === quote) {
                value += sql[index + 1];
                index += 1;
                continue;
            }

            return {
                value,
                endIndex: index,
            };
        }

        return {
            value,
            endIndex: sql.length - 1,
        };
    }

    private static isIdentifierStart(char: string | undefined): boolean
    {
        return Boolean(char?.match(/[A-Za-z_]/));
    }

    private static isIdentifierPart(char: string | undefined): boolean
    {
        return Boolean(char?.match(/[A-Za-z0-9_]/));
    }
}

export class DAO
{
    protected readonly db: QueryProvider;

    constructor(db: QueryProvider)
    {
        this.db = db;
    }

    protected async run(sql: string, params?: SqlParams): Promise<number>
    {
        const result = await this.query(sql, params);
        return result.affectedRows;
    }

    protected async insert(sql: string, params?: SqlParams): Promise<number>
    {
        const result = await this.query(sql, params);
        return result.insertId;
    }

    protected async getOne<T extends object>(
        sql: string,
        params?: SqlParams
    ): Promise<T | undefined>
    {
        const result = await this.query<T>(sql, params);
        return result.rows[0];
    }

    protected async listRows<T extends object>(
        sql: string,
        params?: SqlParams
    ): Promise<T[]>
    {
        const result = await this.query<T>(sql, params);
        return result.rows;
    }

    protected async query<T extends object = Record<string, unknown>>(
        sql: string,
        params?: SqlParams
    ): Promise<DatabaseQueryResult<T>>
    {
        const boundSql = SqlBinder.bind(sql, params);
        return this.db.query<T>(boundSql.text, boundSql.values);
    }
}
// apply-patch-anchor - do not delete
