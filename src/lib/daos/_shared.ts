import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_DDL } from './_schema';
import { SchemaVersionDAO } from './schemaVersionDAO';

// Schema versioning
export const SCHEMA_VERSION = 1;

// DB lifecycle
const DEFAULT_DB_DIR = process.env.YTCW_DB_DIR || '.data';
const DEFAULT_DB_FILE = process.env.YTCW_DB_FILE || 'app.db';
const dbPath = path.resolve(process.cwd(), DEFAULT_DB_DIR, DEFAULT_DB_FILE);
let dbInstance: Database.Database | null = null;

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runAllDDL(db: Database.Database) {
  const schemaDAO = new SchemaVersionDAO(db);
  const tx = db.transaction(() => {
    for (const ddl of ALL_DDL) db.exec(ddl);
    schemaDAO.set(SCHEMA_VERSION);
  });
  tx();
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureDir(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  const schemaDAO = new SchemaVersionDAO(db);
  schemaDAO.createMetaTable();
  const current = schemaDAO.get();
  if (current === null || current < SCHEMA_VERSION) runAllDDL(db);
  dbInstance = db;
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getDbPath() {
  return dbPath;
}

// Base class for DAOs working with a provided SQLite database instance
export class SqliteDAO
{
    protected readonly db: Database.Database;
    private readonly ownDb: boolean;

    constructor(db: Database.Database, options?: { ownDb?: boolean })
    {
        this.db = db;
        this.ownDb = Boolean(options?.ownDb);
    }

    /**
     * Closes the underlying database if this instance owns it.
     * If the db is a shared/singleton passed in from outside, do not set ownDb
     * and this will be a no-op.
     */
    close(): void
    {
        if (this.ownDb && (this.db as any)?.open !== false) {
            this.db.close();
        }
    }
}
