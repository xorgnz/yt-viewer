import { ALL_DDL, CREATE_TABLE_META, SCHEMA_VERSION } from '$lib/daos/_schema';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';

type DatabaseClientProvider = Pick<DatabasePool, 'query'>;

export class LatestSchemaBootstrapper
{
    async apply(pool: DatabaseClientProvider): Promise<void>
    {
        await pool.query('START TRANSACTION');

        try {
            await this.execAll(pool, CREATE_TABLE_META);

            for (const ddl of ALL_DDL) {
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

    private async execAll(pool: DatabaseClientProvider, sql: string): Promise<void>
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

export async function applyLatestSchemaBootstrap(pool: DatabaseClientProvider): Promise<void>
{
    await new LatestSchemaBootstrapper().apply(pool);
}
// apply-patch-anchor - do not delete
