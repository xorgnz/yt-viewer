import type Database from 'better-sqlite3';

// Encapsulates operations for reading/writing the schema version metadata
export class SchemaVersionDAO
{
    private readonly db: Database.Database;

    constructor(db: Database.Database) { this.db = db; }

    createMetaTable(): void
    {
        this.db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    }

    get(): number | null
    {
        try {
            const row = this.db
                .prepare(`SELECT value FROM _meta WHERE key = ?`)
                .get('schema_version') as { value: string } | undefined;
            return row ? Number(row.value) : null;
        } catch {
            return null;
        }
    }

    set(version: number): void
    {
        this.db
            .prepare(`
                INSERT INTO _meta(key, value) VALUES('schema_version', ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value
            `)
            .run(String(version));
    }
}
// apply-patch-anchor - do not delete