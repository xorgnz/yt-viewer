import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LatestSchemaBootstrapper } from '$lib/daos/shared/LatestSchemaBootstrap';

export class RouteDatabaseHarness
{
    readonly tempDir: string;
    readonly dbPath: string;
    readonly db: Database.Database;
    private readonly previousNodeEnv: string | undefined;
    private readonly previousDbDir: string | undefined;

    private constructor(
        tempDir: string,
        dbPath: string,
        db: Database.Database,
        previousNodeEnv: string | undefined,
        previousDbDir: string | undefined
    )
    {
        this.tempDir = tempDir;
        this.dbPath = dbPath;
        this.db = db;
        this.previousNodeEnv = previousNodeEnv;
        this.previousDbDir = previousDbDir;
    }

    static create(prefix: string): RouteDatabaseHarness
    {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
        const previousNodeEnv = process.env.NODE_ENV;
        const previousDbDir = process.env.YTCW_DB_DIR;

        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        const dbPath = path.join(tempDir, 'test.db');
        const db = new Database(dbPath);
        new LatestSchemaBootstrapper().apply(db);

        return new RouteDatabaseHarness(
            tempDir,
            dbPath,
            db,
            previousNodeEnv,
            previousDbDir
        );
    }

    openReadOnly(): Database.Database
    {
        return new Database(this.dbPath, { readonly: true });
    }

    dispose(): void
    {
        this.db.close();
        process.env.NODE_ENV = this.previousNodeEnv;

        if (this.previousDbDir === undefined) {
            delete process.env.YTCW_DB_DIR;
        } else {
            process.env.YTCW_DB_DIR = this.previousDbDir;
        }

        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
    }
}
// apply-patch-anchor - do not delete