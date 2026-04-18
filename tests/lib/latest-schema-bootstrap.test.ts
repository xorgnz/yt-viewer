import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { POSTGRES_CREATE_TABLE_MIGRATION_HISTORY, POSTGRES_CREATE_TABLE_META, SCHEMA_VERSION } from '../../src/lib/daos/_schema';
import {
    applyLatestSchemaBootstrap,
    PostgresLatestSchemaBootstrapper
} from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { SchemaVersionDAO } from '../../src/lib/daos/schemaVersionDAO';

describe('applyLatestSchemaBootstrap', () => {
    it('creates a fresh disposable database at the latest schema version', () => {
        const db = new Database(':memory:');

        applyLatestSchemaBootstrap(db);

        const schemaDao = new SchemaVersionDAO(db);
        const migrationHistoryTable = db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'migration_history'
            `)
            .get() as { name: string } | undefined;
        const watchHistoryTable = db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'watch_history'
            `)
            .get() as { name: string } | undefined;

        expect(schemaDao.get()).toBe(SCHEMA_VERSION);
        expect(migrationHistoryTable?.name).toBe('migration_history');
        expect(watchHistoryTable?.name).toBe('watch_history');

        db.close();
    });

    it('applies the Postgres schema inside a transaction and records the latest version', async () => {
        const queries: Array<{ sql: string; params?: unknown[] }> = [];
        const client = {
            query: async (sql: string, params?: unknown[]) => {
                queries.push({ sql, params });
                return { rows: [] };
            }
        };

        await new PostgresLatestSchemaBootstrapper().applyWithClient(client as never);

        expect(queries[0].sql).toBe('BEGIN');
        expect(queries.some((query) => query.sql === POSTGRES_CREATE_TABLE_META)).toBe(true);
        expect(queries.some((query) => query.sql === POSTGRES_CREATE_TABLE_MIGRATION_HISTORY)).toBe(true);
        expect(queries.at(-1)?.sql).toBe('COMMIT');
        expect(queries.some((query) => query.params?.[0] === String(SCHEMA_VERSION))).toBe(true);
    });

    it('rolls back the Postgres schema transaction when bootstrap fails', async () => {
        const queries: string[] = [];
        const client = {
            query: async (sql: string) => {
                queries.push(sql);

                if (sql === POSTGRES_CREATE_TABLE_META) {
                    throw new Error('boom');
                }

                return { rows: [] };
            }
        };

        await expect(new PostgresLatestSchemaBootstrapper().applyWithClient(client as never)).rejects.toThrow('boom');

        expect(queries).toEqual(['BEGIN', POSTGRES_CREATE_TABLE_META, 'ROLLBACK']);
    });
});
