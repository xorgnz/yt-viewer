import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

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
     * This method does NOT create databases, set pragmas, or run schema migrations.
     * Use the external CLI (scripts/create_database.ts) to create/initialize DB files.
     */
    open(): Database.Database
    {
        if (this.db) return this.db;
        const p = this.path;
        if (!fs.existsSync(p)) {
            throw new Error(`Database file not found at "${p}". Run \`npm run create_database -- ${this.mode}\` first to create it.`);
        }
        this.db = new Database(p);
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
