import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_VERSION } from '$lib/daos/_schema';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';

export enum DatabaseMode
{
    Test = 'test',
    Dev = 'dev',
    Live = 'live'
}

/**
 * DatabaseWrapper centralizes creating/opening/closing/deleting DB files
 * for different modes (test/dev/live).
 */
export class DatabaseWrapper
{
    private readonly mode: DatabaseMode;
    private readonly baseDir: string;
    private readonly fileNames: { test: string; dev: string; live: string };
    private db: Database.Database | null = null;

    constructor(mode: DatabaseMode, options?: { baseDir?: string; fileNames?: Partial<{ test: string; dev: string; live: string }> })
    {
        this.mode = mode;
        this.baseDir = options?.baseDir || process.env.YTCW_DB_DIR || '.data';
        const defaults = { test: 'test.db', dev: 'dev.db', live: process.env.YTCW_DB_FILE || 'app.db' } as const;
        this.fileNames = {
            test: options?.fileNames?.test || defaults.test,
            dev: options?.fileNames?.dev || defaults.dev,
            live: options?.fileNames?.live || defaults.live,
        };
    }

    get path(): string
    {
        const file = this.mode === DatabaseMode.Test
            ? this.fileNames.test
            : this.mode === DatabaseMode.Dev
                ? this.fileNames.dev
                : this.fileNames.live;
        return path.resolve(process.cwd(), this.baseDir, file);
    }

    /**
     * Opens an existing database file for application use.
     * This method does NOT create databases, run latest-schema bootstrap, or run schema migrations.
     * Use the external CLI (scripts/create_database.ts) for fresh-create setup and
     * use (scripts/migrate_database.ts) for explicit in-place upgrades.
     */
    open(): Database.Database
    {
        if (this.db) return this.db;
        const p = this.path;
        if (!fs.existsSync(p)) {
            throw new Error(`Database file not found at "${p}". Run \`npm run create_database -- ${this.mode}\` first to create it.`);
        }

        const db = new Database(p);
        const schemaDao = new SchemaVersionDAO(db);
        const currentVersion = schemaDao.get();

        if (currentVersion === null) {
            db.close();
            throw new Error(`Database at "${p}" has no readable schema version. Recreate it or migrate it explicitly before startup.`);
        }

        if (currentVersion < SCHEMA_VERSION) {
            db.close();

            if (this.mode === DatabaseMode.Test) {
                throw new Error(`Test database at "${p}" is on schema v${currentVersion}. Recreate it with \`npm run create_database -- test\`.`);
            }

            throw new Error(`Database at "${p}" is on schema v${currentVersion}. Run \`npm run migrate_database -- ${this.mode}\` before startup.`);
        }

        if (currentVersion > SCHEMA_VERSION) {
            db.close();
            throw new Error(`Database at "${p}" is on unsupported schema v${currentVersion}. This app supports up to v${SCHEMA_VERSION}.`);
        }

        this.db = db;
        return this.db;
    }

    close(): void
    {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    delete(): void
    {
        this.close();
        const p = this.path;
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    get instance(): Database.Database | null
    {
        return this.db;
    }
}
