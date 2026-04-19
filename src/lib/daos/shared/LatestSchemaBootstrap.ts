import type Database from 'better-sqlite3';
import type { PoolClient } from 'pg';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { ALL_DDL, MYSQL_ALL_DDL, MYSQL_CREATE_TABLE_META, POSTGRES_ALL_DDL, POSTGRES_CREATE_TABLE_META, SCHEMA_VERSION } from '$lib/daos/_schema';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';

type PostgresClientProvider = Pick<PostgresPoolWrapper, 'withClient'>;
type MySqlClientProvider = Pick<MySqlPoolWrapper, 'query'>;

export class LatestSchemaBootstrapper
{
    apply(db: Database.Database): void
    {
        const schemaDao = new SchemaVersionDAO(db);
        schemaDao.createMetaTable();

        const transaction = db.transaction(() => {
            for (const ddl of ALL_DDL) {
                db.exec(ddl);
            }

            schemaDao.set(SCHEMA_VERSION);
        });

        transaction();
    }
}

export function applyLatestSchemaBootstrap(db: Database.Database): void
{
    new LatestSchemaBootstrapper().apply(db);
}

export class PostgresLatestSchemaBootstrapper
{
    async apply(pool: PostgresClientProvider): Promise<void>
    {
        await pool.withClient(async (client) => {
            await this.applyWithClient(client);
        });
    }

    async applyWithClient(client: PoolClient): Promise<void>
    {
        await client.query('BEGIN');

        try {
            await client.query(POSTGRES_CREATE_TABLE_META);

            for (const ddl of POSTGRES_ALL_DDL) {
                await client.query(ddl);
            }

            await client.query(
                `
                    INSERT INTO _meta(key, value) VALUES('schema_version', $1)
                    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value
                `,
                [String(SCHEMA_VERSION)]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }
}

export async function applyLatestPostgresSchemaBootstrap(pool: PostgresClientProvider): Promise<void>
{
    await new PostgresLatestSchemaBootstrapper().apply(pool);
}

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
