import type Database from 'better-sqlite3';
import type { PoolClient } from 'pg';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { ALL_DDL, POSTGRES_ALL_DDL, POSTGRES_CREATE_TABLE_META, SCHEMA_VERSION } from '$lib/daos/_schema';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';

type PostgresClientProvider = Pick<PostgresPoolWrapper, 'withClient'>;

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
