import type {
    QueryResult,
} from 'mysql2/promise';
import type {
    MigrationAdapter,
    MigrationExecutionContext,
} from '$lib/daos/migrations/migrationTypes';
import type { SqlParams } from '$lib/daos/shared/DAO';
import { CREATE_TABLE_META } from '$lib/daos/_schema';
import type { RecordedMigrationState } from '$lib/daos/migrations/MigrationMetadata';
import type { DatabaseQueryResult } from '$lib/daos/shared/DatabasePool';
import { SqlBinder } from '$lib/daos/shared/DAO';

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

class DatabaseConnectionQueryProvider implements DatabaseQueryProvider
{
    private readonly connection: DatabaseTransactionConnection;

    constructor(connection: DatabaseTransactionConnection)
    {
        this.connection = connection;
    }

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values: unknown[] = []
    ): Promise<DatabaseQueryResult<T>>
    {
        const [result] = await this.connection.execute<QueryResult>(text, values as never[]);
        return DatabaseConnectionQueryProvider.mapResult<T>(result);
    }

    private static mapResult<T extends object>(result: QueryResult): DatabaseQueryResult<T>
    {
        if (Array.isArray(result)) {
            return {
                rows: result as T[],
                affectedRows: result.length,
                insertId: 0
            };
        }

        return {
            rows: [],
            affectedRows: result.affectedRows ?? 0,
            insertId: result.insertId ?? 0
        };
    }
}

class DatabaseMigrationExecutionContext implements MigrationExecutionContext
{
    private readonly provider: DatabaseQueryProvider;

    constructor(provider: DatabaseQueryProvider)
    {
        this.provider = provider;
    }

    async exec(sql: string): Promise<void>
    {
        for (const statement of DatabaseMigrationAdapter.splitStatements(sql)) {
            await this.provider.query(statement);
        }
    }

    async run(sql: string, params?: SqlParams): Promise<void>
    {
        const bound = SqlBinder.bind(sql, params);
        await this.provider.query(bound.text, bound.values);
    }

    async get<T>(sql: string, params?: SqlParams): Promise<T | undefined>
    {
        const bound = SqlBinder.bind(sql, params);
        const result = await this.provider.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows[0] as T | undefined;
    }

    async all<T>(sql: string, params?: SqlParams): Promise<T[]>
    {
        const bound = SqlBinder.bind(sql, params);
        const result = await this.provider.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows as T[];
    }
}

export class DatabaseMigrationAdapter implements MigrationAdapter
{
    private readonly provider: DatabaseClientProvider;
    private inTransaction = false;
    private activeTransactionProvider: DatabaseQueryProvider | null = null;

    constructor(provider: DatabaseClientProvider)
    {
        this.provider = provider;
    }

    async getCurrentVersion(): Promise<number | null>
    {
        try {
            const result = await this.getQueryProvider().query<{ value: string }>(
                'SELECT value FROM _meta WHERE `key` = ?',
                ['schema_version']
            );

            const value = result.rows[0]?.value;
            return value === undefined ? null : Number(value);
        } catch (error) {
            console.error('Failed to read _meta.schema_version:', error);
            throw error;
        }
    }

    async getRecordedMigrationState(): Promise<RecordedMigrationState>
    {
        const queryProvider = this.getQueryProvider();
        const tableResult = await queryProvider.query<{ table_name: string }>(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                    AND table_name = ?
            `,
            ['migration_history']
        );

        if (tableResult.rows.length === 0) {
            return {
                historyTableExists: false,
                migrations: [],
            };
        }

        const migrations = await queryProvider.query<{
            version: number;
            name: string;
            success: boolean | number;
        }>(
            `
                SELECT
                    version,
                    name,
                    success
                FROM migration_history
                ORDER BY id
            `
        );

        return {
            historyTableExists: true,
            migrations: migrations.rows.map((migration) => ({
                version: Number(migration.version),
                name: migration.name,
                success: migration.success === true || migration.success === 1,
            })),
        };
    }

    async recordSuccessfulMigration(version: number, name: string): Promise<void>
    {
        const now = Date.now();

        await this.getQueryProvider().query(
            `
                INSERT INTO migration_history(
                    version,
                    name,
                    started_at,
                    applied_at,
                    success,
                    error_message
                ) VALUES(?,?,?,?,?,?)
            `,
            [version, name, now, now, 1, null]
        );
    }

    async setCurrentVersion(version: number): Promise<void>
    {
        const queryProvider = this.getQueryProvider();
        const context = new DatabaseMigrationExecutionContext(queryProvider);
        await context.exec(CREATE_TABLE_META);
        await queryProvider.query(
            `
                INSERT INTO _meta(\`key\`, value) VALUES('schema_version', ?)
                ON DUPLICATE KEY UPDATE value=VALUES(value)
            `,
            [String(version)]
        );
    }

    async runInTransaction<T>(
        operation: (context: MigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.inTransaction) {
            throw new Error('MySQL migrations do not support nested transactions.');
        }

        this.inTransaction = true;
        try {
            return await this.runPinnedTransaction(operation);
        } finally {
            this.inTransaction = false;
        }
    }

    private async runPinnedTransaction<T>(
        operation: (context: MigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.provider.withConnection) {
            return await this.provider.withConnection(async (connection) => {
                const connectionProvider = new DatabaseConnectionQueryProvider(connection);
                this.activeTransactionProvider = connectionProvider;

                await connectionProvider.query('START TRANSACTION');

                try {
                    const context = new DatabaseMigrationExecutionContext(connectionProvider);
                    const result = await operation(context);
                    await connectionProvider.query('COMMIT');
                    return result;
                } catch (error) {
                    await connectionProvider.query('ROLLBACK');
                    throw error;
                } finally {
                    this.activeTransactionProvider = null;
                }
            });
        }

        await this.provider.query('START TRANSACTION');

        try {
            const context = new DatabaseMigrationExecutionContext(this.provider);
            const result = await operation(context);
            await this.provider.query('COMMIT');
            return result;
        } catch (error) {
            await this.provider.query('ROLLBACK');
            throw error;
        }
    }

    private getQueryProvider(): DatabaseQueryProvider
    {
        return this.activeTransactionProvider || this.provider;
    }

    static splitStatements(sql: string): string[]
    {
        return sql
            .split(';')
            .map((statement) => statement.trim())
            .filter((statement) => statement.length > 0);
    }
}
// apply-patch-anchor - do not delete
