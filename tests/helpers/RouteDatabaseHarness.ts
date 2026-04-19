import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';
import { LatestSchemaBootstrapper } from '$lib/daos/shared/LatestSchemaBootstrap';

let activeDatabasePath: string | null = null;

function translateMySqlToSqlite(sql: string): string
{
    let translated = sql
        .replace(/INSERT IGNORE INTO/gi, 'INSERT OR IGNORE INTO')
        .replace(/\(UNIX_TIMESTAMP\(CURRENT_TIMESTAMP\(3\)\) \* 1000\)/gi, "(strftime('%s','now')*1000)");

    if (!translated.includes('ON DUPLICATE KEY UPDATE')) {
        return translated;
    }

    const tableMatch = translated.match(/INSERT INTO\s+([a-z_]+)/i);
    const table = tableMatch?.[1] || '';
    const conflictTargets: Record<string, string> = {
        profiles: '`key`',
        source_channels: 'youtube_id',
        videos: 'youtube_id',
        virtual_channel_assignments: 'source_channel_id, virtual_channel_id',
        virtual_channel_assignment_video_selections: 'assignment_id, video_id',
    };
    const conflictTarget = conflictTargets[table];

    if (!conflictTarget) {
        return translated;
    }

    const [insertSql, updateSql] = translated.split('ON DUPLICATE KEY UPDATE');
    const sqliteUpdateSql = updateSql.replace(/VALUES\((`?[a-z_]+`?)\)/gi, 'excluded.$1');
    return `${insertSql}ON CONFLICT (${conflictTarget}) DO UPDATE SET ${sqliteUpdateSql}`;
}

vi.mock('mysql2/promise', () => {
    return {
        createPool: () => {
            return {
                execute(sql: string, values: unknown[] = []) {
                    if (!activeDatabasePath) {
                        throw new Error('RouteDatabaseHarness has no active database.');
                    }

                    const translatedSql = translateMySqlToSqlite(sql);
                    const db = new Database(activeDatabasePath);

                    try {
                        if (/^\s*SELECT/i.test(translatedSql)) {
                            return [db.prepare(translatedSql).all(...values)];
                        }

                        const result = db.prepare(translatedSql).run(...values);
                        return [
                            {
                                affectedRows: result.changes,
                                insertId: Number(result.lastInsertRowid),
                            }
                        ];
                    } finally {
                        db.close();
                    }
                },
                end() {
                }
            };
        }
    };
});

export class RouteDatabaseHarness
{
    readonly tempDir: string;
    readonly dbPath: string;
    readonly db: Database.Database;
    private readonly previousNodeEnv: string | undefined;
    private readonly previousDbDir: string | undefined;
    private readonly previousDatabaseUrl: string | undefined;

    private constructor(
        tempDir: string,
        dbPath: string,
        db: Database.Database,
        previousNodeEnv: string | undefined,
        previousDbDir: string | undefined,
        previousDatabaseUrl: string | undefined
    )
    {
        this.tempDir = tempDir;
        this.dbPath = dbPath;
        this.db = db;
        this.previousNodeEnv = previousNodeEnv;
        this.previousDbDir = previousDbDir;
        this.previousDatabaseUrl = previousDatabaseUrl;
    }

    static create(prefix: string): RouteDatabaseHarness
    {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
        const previousNodeEnv = process.env.NODE_ENV;
        const previousDbDir = process.env.YTCW_DB_DIR;
        const previousDatabaseUrl = process.env.DATABASE_URL;

        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;
        process.env.DATABASE_URL = 'mysql://test-user:test-password@localhost:3306/yt_viewer_test';

        const dbPath = path.join(tempDir, 'test.db');
        const db = new Database(dbPath);
        new LatestSchemaBootstrapper().apply(db);
        activeDatabasePath = dbPath;

        return new RouteDatabaseHarness(
            tempDir,
            dbPath,
            db,
            previousNodeEnv,
            previousDbDir,
            previousDatabaseUrl
        );
    }

    openReadOnly(): Database.Database
    {
        return new Database(this.dbPath, { readonly: true });
    }

    dispose(): void
    {
        this.db.close();
        activeDatabasePath = null;
        process.env.NODE_ENV = this.previousNodeEnv;

        if (this.previousDbDir === undefined) {
            delete process.env.YTCW_DB_DIR;
        } else {
            process.env.YTCW_DB_DIR = this.previousDbDir;
        }

        if (this.previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = this.previousDatabaseUrl;
        }

        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
    }
}
// apply-patch-anchor - do not delete
