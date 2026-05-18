import type { QueryResult } from 'mysql2/promise';
import { ALL_DDL, CREATE_TABLE_META, SCHEMA_VERSION } from '$lib/daos/_schema';
import type { DatabaseQueryResult } from '$lib/daos/shared/DatabasePool';

type DatabaseQueryProvider = {
    query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]): Promise<DatabaseQueryResult<T>>;
};
type DatabaseTransactionConnection = {
    execute<TResult>(text: string, values?: unknown[]): Promise<[TResult]>;
    release(): void;
};

type DatabaseClientProvider = DatabaseQueryProvider & {
    withConnection?<T>(work: (connection: DatabaseTransactionConnection) => Promise<T> | T): Promise<T>;
};

export class LatestSchemaBootstrapper
{
    async apply(pool: DatabaseClientProvider): Promise<void>
    {
        if (pool.withConnection) {
            await pool.withConnection(async (connection) => {
                const queryProvider: DatabaseQueryProvider = {
                    query: async <T extends object = Record<string, unknown>>(text: string, values?: unknown[]) => {
                        const [result] = await connection.execute<QueryResult>(text, (values || []) as never[]);

                        if (Array.isArray(result)) {
                            return {
                                rows: result as T[],
                                affectedRows: result.length,
                                insertId: 0
                            } satisfies DatabaseQueryResult<T>;
                        }

                        return {
                            rows: [],
                            affectedRows: result.affectedRows ?? 0,
                            insertId: result.insertId ?? 0
                        } satisfies DatabaseQueryResult<T>;
                    }
                };

                await this.applyWithProvider(queryProvider);
            });
            return;
        }

        await this.applyWithProvider(pool);
    }

    private async applyWithProvider(queryProvider: DatabaseQueryProvider): Promise<void>
    {
        await queryProvider.query('START TRANSACTION');

        try {
            await this.execAll(queryProvider, CREATE_TABLE_META);

            for (const ddl of ALL_DDL) {
                await this.execAll(queryProvider, ddl);
            }

            await queryProvider.query(
                `
                    INSERT INTO _meta(\`key\`, value) VALUES('schema_version', ?)
                    ON DUPLICATE KEY UPDATE value=VALUES(value)
                `,
                [String(SCHEMA_VERSION)]
            );

            await queryProvider.query('COMMIT');
        } catch (error) {
            await queryProvider.query('ROLLBACK');
            throw error;
        }
    }

    private async execAll(queryProvider: DatabaseQueryProvider, sql: string): Promise<void>
    {
        for (const statement of this.splitStatements(sql)) {
            await queryProvider.query(statement);
        }
    }

    private splitStatements(sql: string): string[]
    {
        return sql
            .split(';')
            .map((statement) => statement.trim())
            .filter((statement) => statement.length > 0);
    }
}

export async function applyLatestSchemaBootstrap(pool: DatabaseClientProvider): Promise<void>
{
    await new LatestSchemaBootstrapper().apply(pool);
}
// apply-patch-anchor - do not delete
