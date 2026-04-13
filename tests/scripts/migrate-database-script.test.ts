import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrationWorkflow } from '../../scripts/migrate_database';
import type { MigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import { MIGRATIONS } from '../../src/lib/daos/migrations/registry';
import { SchemaVersionDAO } from '../../src/lib/daos/schemaVersionDAO';
import { createPreV8DatabaseFile } from '../helpers/MigrationFixtureBuilder';

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
