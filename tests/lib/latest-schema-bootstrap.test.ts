import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../../src/lib/daos/_schema';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
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
});
