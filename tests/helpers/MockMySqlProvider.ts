import type { MySqlQueryResult } from '../../src/lib/daos/shared/MySqlPoolWrapper';

export type MockMySqlQueryCall = {
    text: string;
    values: unknown[];
};

export type MockMySqlResultFactory = (
    text: string,
    values: unknown[]
) => MySqlQueryResult<object> | undefined;

export class MockMySqlProvider
{
    readonly calls: MockMySqlQueryCall[] = [];
    private readonly resultFactory: MockMySqlResultFactory;

    constructor(resultFactory?: MockMySqlResultFactory)
    {
        this.resultFactory = resultFactory || (() => undefined);
    }

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values: unknown[] = []
    ): Promise<MySqlQueryResult<T>>
    {
        this.calls.push({ text, values });

        return (this.resultFactory(text, values) || MockMySqlProvider.result<T>([])) as MySqlQueryResult<T>;
    }

    static result<T extends object>(
        rows: T[],
        options?: {
            affectedRows?: number;
            insertId?: number;
        }
    ): MySqlQueryResult<T>
    {
        return {
            rows,
            affectedRows: options?.affectedRows ?? rows.length,
            insertId: options?.insertId ?? 0,
        };
    }
}
// apply-patch-anchor - do not delete
