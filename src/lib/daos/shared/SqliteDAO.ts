import Database from 'better-sqlite3';

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
