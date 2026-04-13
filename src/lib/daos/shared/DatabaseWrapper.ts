import Database from 'better-sqlite3';
import fs from 'node:fs';
import { SCHEMA_VERSION } from '$lib/daos/_schema';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { DatabaseFileLayout, DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';

export { DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';

/**
 * DatabaseWrapper centralizes creating/opening/closing/deleting DB files
 * for different modes (test/dev/live).
 */
export class DatabaseWrapper
{
    private readonly mode: DatabaseMode;
    private readonly fileLayout: DatabaseFileLayout;
    private db: Database.Database | null = null;

    constructor(mode: DatabaseMode, options?: { baseDir?: string; fileNames?: Partial<{ test: string; dev: string; live: string }> })
    {
        this.mode = mode;
        this.fileLayout = new DatabaseFileLayout(options);
    }

    get path(): string
    {
        return this.fileLayout.resolveDatabasePath(this.mode);
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
