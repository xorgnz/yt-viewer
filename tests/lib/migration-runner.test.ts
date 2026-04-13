import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../../src/lib/daos/migrations/registry';
import { SchemaVersionDAO } from '../../src/lib/daos/schemaVersionDAO';
import { MigrationRunner } from '../../src/lib/daos/shared/MigrationRunner';
import { SqliteMigrationAdapter } from '../../src/lib/daos/shared/SqliteMigrationAdapter';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';
import { createPreV8Database } from '../helpers/MigrationFixtureBuilder';

describe('MigrationRunner', () => {
    it('migrates a supported prior database state to the latest version', () => {
        const db = createPreV8Database();
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);

        const result = runner.runToLatest();
        const schemaVersion = new SchemaVersionDAO(db).get();
        const migrationHistoryTable = db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'migration_history'
            `)
            .get() as { name: string } | undefined;

        expect(result.currentVersion).toBe(7);
        expect(result.targetVersion).toBe(8);
        expect(result.finalVersion).toBe(8);
        expect(result.appliedMigrations).toEqual([
            {
                version: 8,
                name: 'add_migration_history',
            }
        ]);
        expect(schemaVersion).toBe(8);
        expect(migrationHistoryTable?.name).toBe('migration_history');

        db.close();
    });

    it('records migration metadata with version, name, timestamps, and success state', () => {
        const db = createPreV8Database();
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);

        runner.runToLatest();

        const historyRows = db
            .prepare(`
                SELECT
                    version,
                    name,
                    started_at,
                    applied_at,
                    success
                FROM migration_history
                ORDER BY id
            `)
            .all() as Array<{
                version: number;
                name: string;
                started_at: number;
                applied_at: number | null;
                success: number;
            }>;

        expect(historyRows).toHaveLength(1);
        expect(historyRows[0].version).toBe(8);
        expect(historyRows[0].name).toBe('add_migration_history');
        expect(historyRows[0].success).toBe(1);
        expect(typeof historyRows[0].started_at).toBe('number');
        expect(historyRows[0].started_at).toBeGreaterThan(0);
        expect(typeof historyRows[0].applied_at).toBe('number');
        expect(historyRows[0].applied_at).toBeGreaterThanOrEqual(historyRows[0].started_at);

        db.close();
    });

    it('refuses to migrate when the schema version is unknown', () => {
        const harness = InMemoryDatabaseHarness.createEmpty();
        const { db } = harness;
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);

        expect(() => runner.runToLatest()).toThrow('Database schema version is unknown.');

        harness.close();
    });

    it('refuses to migrate when required migration metadata is inconsistent', () => {
        const db = createPreV8Database();

        db.exec(`
            CREATE TABLE migration_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER NOT NULL,
                name TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                applied_at INTEGER DEFAULT NULL,
                success INTEGER NOT NULL DEFAULT 0,
                error_message TEXT DEFAULT NULL
            );
        `);

        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);

        expect(() => runner.runToLatest()).toThrow(
            'Migration metadata exists for a database version that predates supported migrations.'
        );

        db.close();
    });
});
