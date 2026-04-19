import type { QueryResult, QueryResultRow } from 'pg';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';

export type PostgresSqlParams = unknown[] | Record<string, unknown>;

export type PostgresBoundSql = {
    text: string;
    values: unknown[];
};

type PostgresQueryProvider = Pick<PostgresPoolWrapper, 'query'>;

export class PostgresSqlBinder
{
    static bind(sql: string, params?: PostgresSqlParams): PostgresBoundSql
    {
        if (!params) {
            return {
                text: sql,
                values: [],
            };
        }

        if (Array.isArray(params)) {
            return {
                text: PostgresSqlBinder.convertQuestionPlaceholders(sql),
                values: params,
            };
        }

        return PostgresSqlBinder.convertNamedPlaceholders(sql, params);
    }

    private static convertQuestionPlaceholders(sql: string): string
    {
        let index = 0;

        return PostgresSqlBinder.replaceOutsideQuotedText(sql, (char) => {
            if (char !== '?') {
                return char;
            }

            index += 1;
            return `$${index}`;
        });
    }

    private static convertNamedPlaceholders(
        sql: string,
        params: Record<string, unknown>
    ): PostgresBoundSql
    {
        const values: unknown[] = [];
        const indexesByName = new Map<string, number>();
        let output = '';

        for (let index = 0; index < sql.length; index++) {
            const char = sql[index];
            const previousChar = sql[index - 1];
            const nextChar = sql[index + 1];

            if (char === '\'' || char === '"') {
                const quoted = PostgresSqlBinder.readQuotedText(sql, index, char);
                output += quoted.value;
                index = quoted.endIndex;
                continue;
            }

            if (
                char !== ':'
                || previousChar === ':'
                || nextChar === ':'
                || !PostgresSqlBinder.isIdentifierStart(nextChar)
            ) {
                output += char;
                continue;
            }

            const nameStart = index + 1;
            let nameEnd = nameStart + 1;

            while (PostgresSqlBinder.isIdentifierPart(sql[nameEnd])) {
                nameEnd += 1;
            }

            const name = sql.slice(nameStart, nameEnd);

            if (!Object.prototype.hasOwnProperty.call(params, name)) {
                throw new Error(`Missing SQL parameter ":${name}".`);
            }

            let placeholderIndex = indexesByName.get(name);

            if (!placeholderIndex) {
                values.push(params[name]);
                placeholderIndex = values.length;
                indexesByName.set(name, placeholderIndex);
            }

            output += `$${placeholderIndex}`;
            index = nameEnd - 1;
        }

        return {
            text: output,
            values,
        };
    }

    private static replaceOutsideQuotedText(
        sql: string,
        replace: (char: string) => string
    ): string
    {
        let output = '';

        for (let index = 0; index < sql.length; index++) {
            const char = sql[index];

            if (char === '\'' || char === '"') {
                const quoted = PostgresSqlBinder.readQuotedText(sql, index, char);
                output += quoted.value;
                index = quoted.endIndex;
                continue;
            }

            output += replace(char);
        }

        return output;
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

export class PostgresDAO
{
    protected readonly db: PostgresQueryProvider;

    constructor(db: PostgresQueryProvider)
    {
        this.db = db;
    }

    protected async run(sql: string, params?: PostgresSqlParams): Promise<number>
    {
        const result = await this.query(sql, params);
        return result.rowCount ?? 0;
    }

    protected async getOne<T extends QueryResultRow>(
        sql: string,
        params?: PostgresSqlParams
    ): Promise<T | undefined>
    {
        const result = await this.query<T>(sql, params);
        return result.rows[0];
    }

    protected async listRows<T extends QueryResultRow>(
        sql: string,
        params?: PostgresSqlParams
    ): Promise<T[]>
    {
        const result = await this.query<T>(sql, params);
        return result.rows;
    }

    protected async query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params?: PostgresSqlParams
    ): Promise<QueryResult<T>>
    {
        const boundSql = PostgresSqlBinder.bind(sql, params);
        return this.db.query<T>(boundSql.text, boundSql.values);
    }
}
// apply-patch-anchor - do not delete