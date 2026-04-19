import type {
    AsyncMigrationAdapter,
    AsyncMigrationExecutionContext,
    RecordedMigrationState,
    SqlParams,
} from '$lib/daos/migrations/migrationTypes';
import { MYSQL_CREATE_TABLE_META } from '$lib/daos/_schema';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { MySqlSqlBinder } from '$lib/daos/shared/MySqlDAO';

type MySqlClientProvider = Pick<MySqlPoolWrapper, 'query'>;

class MySqlMigrationExecutionContext implements AsyncMigrationExecutionContext
{
    private readonly provider: MySqlClientProvider;

    constructor(provider: MySqlClientProvider)
    {
        this.provider = provider;
    }

    async exec(sql: string): Promise<void>
    {
        for (const statement of MySqlMigrationAdapter.splitStatements(sql)) {
            await this.provider.query(statement);
        }
    }

    async run(sql: string, params?: SqlParams): Promise<void>
    {
        const bound = MySqlSqlBinder.bind(sql, params);
        await this.provider.query(bound.text, bound.values);
    }

    async get<T>(sql: string, params?: SqlParams): Promise<T | undefined>
    {
        const bound = MySqlSqlBinder.bind(sql, params);
        const result = await this.provider.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows[0] as T | undefined;
    }

    async all<T>(sql: string, params?: SqlParams): Promise<T[]>
    {
        const bound = MySqlSqlBinder.bind(sql, params);
        const result = await this.provider.query<T & Record<string, unknown>>(bound.text, bound.values);
        return result.rows as T[];
    }
}

export class MySqlMigrationAdapter implements AsyncMigrationAdapter
{
    private readonly provider: MySqlClientProvider;
    private inTransaction = false;

    constructor(provider: MySqlClientProvider)
    {
        this.provider = provider;
    }

    async getCurrentVersion(): Promise<number | null>
    {
        try {
            const result = await this.provider.query<{ value: string }>(
                'SELECT value FROM _meta WHERE `key` = ?',
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
        const tableResult = await this.provider.query<{ table_name: string }>(
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

        const migrations = await this.provider.query<{
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

        await this.provider.query(
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
        const context = new MySqlMigrationExecutionContext(this.provider);
        await context.exec(MYSQL_CREATE_TABLE_META);
        await this.provider.query(
            `
                INSERT INTO _meta(\`key\`, value) VALUES('schema_version', ?)
                ON DUPLICATE KEY UPDATE value=VALUES(value)
            `,
            [String(version)]
        );
    }

    async runInTransaction<T>(
        operation: (context: AsyncMigrationExecutionContext) => Promise<T> | T
    ): Promise<T>
    {
        if (this.inTransaction) {
            throw new Error('MySQL migrations do not support nested transactions.');
        }

        this.inTransaction = true;
        await this.provider.query('START TRANSACTION');

        try {
            const context = new MySqlMigrationExecutionContext(this.provider);
            const result = await operation(context);
            await this.provider.query('COMMIT');
            return result;
        } catch (error) {
            await this.provider.query('ROLLBACK');
            throw error;
        } finally {
            this.inTransaction = false;
        }
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
