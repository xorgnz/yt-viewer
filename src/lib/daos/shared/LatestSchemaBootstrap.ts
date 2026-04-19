import { MYSQL_ALL_DDL, MYSQL_CREATE_TABLE_META, SCHEMA_VERSION } from '$lib/daos/_schema';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';

type MySqlClientProvider = Pick<MySqlPoolWrapper, 'query'>;

export class MySqlLatestSchemaBootstrapper
{
    async apply(pool: MySqlClientProvider): Promise<void>
    {
        await pool.query('START TRANSACTION');

        try {
            await this.execAll(pool, MYSQL_CREATE_TABLE_META);

            for (const ddl of MYSQL_ALL_DDL) {
                await this.execAll(pool, ddl);
            }

            await pool.query(
                `
                    INSERT INTO _meta(\`key\`, value) VALUES('schema_version', ?)
                    ON DUPLICATE KEY UPDATE value=VALUES(value)
                `,
                [String(SCHEMA_VERSION)]
            );

            await pool.query('COMMIT');
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    }

    private async execAll(pool: MySqlClientProvider, sql: string): Promise<void>
    {
        for (const statement of this.splitStatements(sql)) {
            await pool.query(statement);
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

export async function applyLatestMySqlSchemaBootstrap(pool: MySqlClientProvider): Promise<void>
{
    await new MySqlLatestSchemaBootstrapper().apply(pool);
}
// apply-patch-anchor - do not delete
