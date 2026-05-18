import type {QueryResult,} from 'mysql2/promise';
import type {SqlParams} from '$lib/daos/shared/DAO';
import {SqlBinder} from '$lib/daos/shared/DAO';
import {CREATE_TABLE_META} from '$lib/daos/_schema';
import type {DatabasePool, DatabaseQueryResult} from '$lib/daos/shared/DatabasePool';

class DatabaseConnectionQueryRunner
{
    private readonly connection: Parameters<NonNullable<DatabasePool['withConnection']>>[0] extends (connection: infer T) => unknown
        ? T
        : never;

    constructor(
        connection: Parameters<NonNullable<DatabasePool['withConnection']>>[0] extends (connection: infer T) => unknown
            ? T
            : never
    )
    {
        this.connection = connection;
    }

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values: unknown[] = []
    ): Promise<DatabaseQueryResult<T>>
    {
        const [result] = await this.connection.execute<QueryResult>(text, values as never[]);
        return DatabaseConnectionQueryRunner.mapResult<T>(result);
    }

    private static mapResult<T extends object>(result: QueryResult): DatabaseQueryResult<T>
    {
        if (Array.isArray(result))
        {
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

export class DatabaseMigrationExecutionContext
{
    private readonly query: DatabasePool['query'];

    constructor(query: DatabasePool['query'])
    {
        this.query = query;
    }

    async exec(sql: string): Promise<void>
    {
        for (const statement of DatabaseMigrationAdapter.splitStatements(sql))
        {
            await this.query(statement);
        }
    }

    async run(sql: string, params?: SqlParams): Promise<void>
    {
        const bound = SqlBinder.bind(sql, params);
        await this.query(bound.text, bound.values);
    }

    async get<T>(sql: string, params?: SqlParams): Promise<T | undefined>
    {
        const bound = SqlBinder.bind(sql, params);
        const result = await this.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows[0] as T | undefined;
    }

    async all<T>(sql: string, params?: SqlParams): Promise<T[]>
    {
        const bound = SqlBinder.bind(sql, params);
        const result = await this.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows as T[];
    }
}

export interface RecordedMigration
{
    version: number;
    name: string;
    success: boolean;
}

export interface RecordedMigrationState
{
    historyTableExists: boolean;
    migrations: RecordedMigration[];
}

export class DatabaseMigrationAdapter
{
    private readonly query: DatabasePool['query'];
    private readonly withConnection: DatabasePool['withConnection'] | undefined;
    private inTransaction = false;
    private activeQuery: DatabasePool['query'] | null = null;

    constructor(query: DatabasePool['query'], withConnection?: DatabasePool['withConnection'])
    {
        this.query = query;
        this.withConnection = withConnection;
    }

    async getCurrentVersion(): Promise<number | null>
    {
        try
        {
            const result = await this.getQuery()<{
                value: string
            }>(
                'SELECT value FROM _meta WHERE `key` = ?',
                ['schema_version']
            );

            const value = result.rows[0]?.value;
            return value === undefined ? null : Number(value);
        }
        catch (error)
        {
            console.error('Failed to read _meta.schema_version:', error);
            throw error;
        }
    }

    async getRecordedMigrationState(): Promise<RecordedMigrationState>
    {
        const query = this.getQuery();
        const tableResult = await query<{ table_name: string }>(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = ?
            `,
            ['migration_history']
        );

        if (tableResult.rows.length === 0)
        {
            return {
                historyTableExists: false,
                migrations: [],
            };
        }

        const migrations = await query<{
            version: number;
            name: string;
            success: boolean | number;
        }>(
            `
                SELECT version,
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

        await this.getQuery()(
            `
                INSERT INTO migration_history(version,
                                              name,
                                              started_at,
                                              applied_at,
                                              success,
                                              error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [version, name, now, now, 1, null]
        );
    }

    async setCurrentVersion(version: number): Promise<void>
    {
        const query = this.getQuery();
        const context = new DatabaseMigrationExecutionContext(query);
        await context.exec(CREATE_TABLE_META);
        await query(
            `
                INSERT INTO _meta(\`key\`, value)
                VALUES ('schema_version', ?)
                ON DUPLICATE KEY UPDATE value=VALUES(value)
            `,
            [String(version)]
        );
    }

    async runInTransaction<T>(
        operation: (context: DatabaseMigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.inTransaction)
        {
            throw new Error('MySQL migration do not support nested transactions.');
        }

        this.inTransaction = true;
        try
        {
            return await this.runPinnedTransaction(operation);
        }
        finally
        {
            this.inTransaction = false;
        }
    }

    private async runPinnedTransaction<T>(
        operation: (context: DatabaseMigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.withConnection)
        {
            return await this.withConnection(async (connection) =>
            {
                const connectionRunner = new DatabaseConnectionQueryRunner(connection);
                this.activeQuery = connectionRunner.query.bind(connectionRunner);

                await this.activeQuery('START TRANSACTION');

                try
                {
                    const context = new DatabaseMigrationExecutionContext(this.activeQuery);
                    const result = await operation(context);
                    await this.activeQuery('COMMIT');
                    return result;
                }
                catch (error)
                {
                    await this.activeQuery('ROLLBACK');
                    throw error;
                }
                finally
                {
                    this.activeQuery = null;
                }
            });
        }

        await this.query('START TRANSACTION');

        try
        {
            const context = new DatabaseMigrationExecutionContext(this.query);
            const result = await operation(context);
            await this.query('COMMIT');
            return result;
        }
        catch (error)
        {
            await this.query('ROLLBACK');
            throw error;
        }
    }

    private getQuery(): DatabasePool['query']
    {
        return this.activeQuery || this.query;
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
