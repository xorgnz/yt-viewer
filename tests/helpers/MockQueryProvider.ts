import type { DatabaseQueryResult } from '../../src/lib/daos/shared/DatabasePool';

export type MockQueryCall = {
    text: string;
    values: unknown[];
};

export type MockQueryResultFactory = (
    text: string,
    values: unknown[]
) => DatabaseQueryResult<object> | undefined;

export class MockQueryProvider
{
    readonly calls: MockQueryCall[] = [];
    private readonly resultFactory: MockQueryResultFactory;

    constructor(resultFactory?: MockQueryResultFactory)
    {
        this.resultFactory = resultFactory || (() => undefined);
    }

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values: unknown[] = []
    ): Promise<DatabaseQueryResult<T>>
    {
        this.calls.push({ text, values });

        return (this.resultFactory(text, values) || MockQueryProvider.result<T>([])) as DatabaseQueryResult<T>;
    }

    static result<T extends object>(
        rows: T[],
        options?: {
            affectedRows?: number;
            insertId?: number;
        }
    ): DatabaseQueryResult<T>
    {
        return {
            rows,
            affectedRows: options?.affectedRows ?? rows.length,
            insertId: options?.insertId ?? 0,
        };
    }
}
// apply-patch-anchor - do not delete
