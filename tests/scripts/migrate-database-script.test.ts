import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrationWorkflow } from '../../scripts/migrate_database';
import type { MigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import { MIGRATIONS } from '../../src/lib/daos/migrations/registry';
import { SchemaVersionDAO } from '../../src/lib/daos/schemaVersionDAO';

function createPreV8DatabaseFile(dbPath: string): void
{
    const db = new Database(dbPath);

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
    db.close();
}

const tempDirs: string[] = [];

describe('runMigrationWorkflow', () => {
    afterEach(() => {
        while (tempDirs.length > 0) {
            fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
        }
    });

    it('creates a backup before a successful migration run', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-viewer-migrate-success-'));
        tempDirs.push(tempDir);

        const dbPath = path.join(tempDir, 'dev.db');
        createPreV8DatabaseFile(dbPath);

        const result = runMigrationWorkflow({
            dbPath,
            migrations: MIGRATIONS,
        });
        const migratedDb = new Database(dbPath);
        const finalVersion = new SchemaVersionDAO(migratedDb).get();
        migratedDb.close();

        expect(fs.existsSync(result.backupPath)).toBe(true);
        expect(result.failedArtifactPath).toBeNull();
        expect(finalVersion).toBe(8);
    });

    it('restores the original database and keeps a failed artifact when migration fails', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-viewer-migrate-fail-'));
        tempDirs.push(tempDir);

        const dbPath = path.join(tempDir, 'dev.db');
        createPreV8DatabaseFile(dbPath);

        const failingMigrations: MigrationDefinition[] = [
            {
                version: 8,
                name: 'broken_migration',
                apply(context) {
                    context.exec(`CREATE TABLE migration_history (id INTEGER PRIMARY KEY AUTOINCREMENT);`);
                    throw new Error('forced migration failure');
                }
            }
        ];

        expect(() => runMigrationWorkflow({
            dbPath,
            migrations: failingMigrations,
        })).toThrow('forced migration failure');

        const restoredDb = new Database(dbPath);
        const restoredVersion = new SchemaVersionDAO(restoredDb).get();
        const restoredHistoryTable = restoredDb
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'migration_history'
            `)
            .get() as { name: string } | undefined;
        restoredDb.close();

        const failedArtifacts = fs.readdirSync(tempDir).filter((file) => file.includes('.failed.db'));
        const backups = fs.readdirSync(tempDir).filter((file) => file.includes('.bak.db'));

        expect(restoredVersion).toBe(7);
        expect(restoredHistoryTable).toBeUndefined();
        expect(failedArtifacts.length).toBe(1);
        expect(backups.length).toBe(1);
    });
});
