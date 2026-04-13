import type Database from 'better-sqlite3';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { ALL_DDL, SCHEMA_VERSION } from '$lib/daos/_schema';

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
