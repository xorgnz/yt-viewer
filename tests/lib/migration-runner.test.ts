import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../../src/lib/daos/migrations/registry';
import { SchemaVersionDAO } from '../../src/lib/daos/schemaVersionDAO';
import { MigrationRunner } from '../../src/lib/daos/shared/MigrationRunner';
import { SqliteMigrationAdapter } from '../../src/lib/daos/shared/SqliteMigrationAdapter';

function createPreV8Database(): Database.Database
{
    const db = new Database(':memory:');

    db.exec(`
        CREATE TABLE _meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE source_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            youtube_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            thumbnail_url TEXT DEFAULT NULL,
            published_at INTEGER DEFAULT NULL,
            last_refreshed_at INTEGER DEFAULT NULL
        );

        CREATE TABLE virtual_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE virtual_channel_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_channel_id INTEGER NOT NULL,
            virtual_channel_id INTEGER NOT NULL,
            mode TEXT NOT NULL DEFAULT 'all',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
            CHECK (mode IN ('all', 'long_only', 'selected_only')),
            FOREIGN KEY (source_channel_id) REFERENCES source_channels(id) ON DELETE CASCADE,
            FOREIGN KEY (virtual_channel_id) REFERENCES virtual_channels(id) ON DELETE CASCADE,
            UNIQUE (source_channel_id, virtual_channel_id)
        );

        CREATE TABLE videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            youtube_id TEXT NOT NULL UNIQUE,
            channel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            published_at INTEGER DEFAULT NULL,
            duration_seconds INTEGER DEFAULT NULL,
            thumbnail_url TEXT DEFAULT NULL,
            length_classification TEXT DEFAULT 'unknown',
            CHECK (length_classification IN ('long', 'short', 'unknown')),
            FOREIGN KEY (channel_id) REFERENCES source_channels(id) ON DELETE CASCADE
        );

        CREATE TABLE virtual_channel_assignment_video_selections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            review_state TEXT NOT NULL DEFAULT 'not_yet_reviewed',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
            CHECK (review_state IN ('included', 'ignored', 'not_yet_reviewed')),
            FOREIGN KEY (assignment_id) REFERENCES virtual_channel_assignments(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            UNIQUE (assignment_id, video_id)
        );

        CREATE TABLE profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );

        CREATE TABLE video_flags (
            video_id INTEGER NOT NULL,
            profile_id INTEGER NOT NULL,
            ignored INTEGER NOT NULL DEFAULT 0,
            watched INTEGER NOT NULL DEFAULT 0,
            favorite INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
            PRIMARY KEY (video_id, profile_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );

        CREATE TABLE watch_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            profile_id INTEGER NOT NULL,
            session_started_at INTEGER NOT NULL,
            last_updated_at INTEGER NOT NULL,
            time_watched_seconds INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
    `);

    new SchemaVersionDAO(db).set(7);

    return db;
}

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
        const db = new Database(':memory:');
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);

        expect(() => runner.runToLatest()).toThrow('Database schema version is unknown.');

        db.close();
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
