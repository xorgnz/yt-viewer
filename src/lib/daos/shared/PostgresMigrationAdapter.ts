import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import type {
    AsyncMigrationAdapter,
    AsyncMigrationExecutionContext,
    RecordedMigrationState,
    SqlParams,
} from '$lib/daos/migrations/migrationTypes';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { POSTGRES_CREATE_TABLE_META } from '$lib/daos/_schema';

type PostgresClientProvider = Pick<PostgresPoolWrapper, 'withClient'>;

function hasNamedParams(params: SqlParams | undefined): params is Record<string, unknown>
{
    return params !== undefined && !Array.isArray(params);
}

function toPositionalParams(params: SqlParams | undefined): unknown[] | undefined
{
    if (hasNamedParams(params)) {
        throw new Error('Postgres migrations require positional $1-style parameters.');
    }

    return params;
}

class PostgresMigrationExecutionContext implements AsyncMigrationExecutionContext
{
    private readonly client: PoolClient;

    constructor(client: PoolClient)
    {
        this.client = client;
    }

    async exec(sql: string): Promise<void>
    {
        await this.client.query(sql);
    }

    async run(sql: string, params?: SqlParams): Promise<void>
    {
        await this.client.query(sql, toPositionalParams(params));
    }

    async get<T>(sql: string, params?: SqlParams): Promise<T | undefined>
    {
        const result = await this.client.query(sql, toPositionalParams(params));
        return result.rows[0] as T | undefined;
    }

    async all<T>(sql: string, params?: SqlParams): Promise<T[]>
    {
        const result = await this.client.query(sql, toPositionalParams(params));
        return result.rows as T[];
    }
}

export class PostgresMigrationAdapter implements AsyncMigrationAdapter
{
    private readonly provider: PostgresClientProvider;
    private transactionClient: PoolClient | null = null;

    constructor(provider: PostgresClientProvider)
    {
        this.provider = provider;
    }

    private async query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params?: unknown[]
    ): Promise<QueryResult<T>>
    {
        if (this.transactionClient) {
            return this.transactionClient.query<T>(sql, params);
        }

        return this.provider.withClient((client) => client.query<T>(sql, params));
    }

    async getCurrentVersion(): Promise<number | null>
    {
        try {
            const result = await this.query<{ value: string }>(
                `SELECT value FROM _meta WHERE key = $1`,
                ['schema_version']
            );
            const value = result.rows[0]?.value;
            return value === undefined ? null : Number(value);
        } catch {
            return null;
        }
    }

    async getRecordedMigrationState(): Promise<RecordedMigrationState>
    {
        const tableResult = await this.query<{ table_name: string }>(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                    AND table_name = $1
            `,
            ['migration_history']
        );

        if (tableResult.rows.length === 0) {
            return {
                historyTableExists: false,
                migrations: [],
            };
        }

        const migrations = await this.query<{
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

        await this.query(
            `
                INSERT INTO migration_history(
                    version,
                    name,
                    started_at,
                    applied_at,
                    success,
                    error_message
                ) VALUES($1,$2,$3,$4,$5,$6)
            `,
            [version, name, now, now, true, null]
        );
    }

    async setCurrentVersion(version: number): Promise<void>
    {
        await this.query(POSTGRES_CREATE_TABLE_META);
        await this.query(
            `
                INSERT INTO _meta(key, value) VALUES('schema_version', $1)
                ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value
            `,
            [String(version)]
        );
    }

    async runInTransaction<T>(
        operation: (context: AsyncMigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.transactionClient) {
            throw new Error('Postgres migrations do not support nested transactions.');
        }

        return this.provider.withClient(async (client) => {
            this.transactionClient = client;
            await client.query('BEGIN');

            try {
                const context = new PostgresMigrationExecutionContext(client);
                const result = await operation(context);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                this.transactionClient = null;
            }
        });
    }
}
