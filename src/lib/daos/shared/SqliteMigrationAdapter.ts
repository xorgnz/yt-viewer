import type Database from 'better-sqlite3';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import type {
    MigrationAdapter,
    MigrationExecutionContext,
    RecordedMigrationState,
    SqlParams,
} from '$lib/daos/migrations/migrationTypes';

function hasNamedParams(params: SqlParams | undefined): params is Record<string, unknown>
{
    return params !== undefined && !Array.isArray(params);
}

function hasPositionalParams(params: SqlParams | undefined): params is unknown[]
{
    return Array.isArray(params);
}

class SqliteMigrationExecutionContext implements MigrationExecutionContext
{
    private readonly db: Database.Database;

    constructor(db: Database.Database)
    {
        this.db = db;
    }

    exec(sql: string): void
    {
        this.db.exec(sql);
    }

    run(sql: string, params?: SqlParams): void
    {
        const statement = this.db.prepare(sql);

        if (hasPositionalParams(params)) {
            statement.run(...params);
            return;
        }

        if (hasNamedParams(params)) {
            statement.run(params);
            return;
        }

        statement.run();
    }

    get<T>(sql: string, params?: SqlParams): T | undefined
    {
        const statement = this.db.prepare(sql);

        if (hasPositionalParams(params)) {
            return statement.get(...params) as T | undefined;
        }

        if (hasNamedParams(params)) {
            return statement.get(params) as T | undefined;
        }

        return statement.get() as T | undefined;
    }

    all<T>(sql: string, params?: SqlParams): T[]
    {
        const statement = this.db.prepare(sql);

        if (hasPositionalParams(params)) {
            return statement.all(...params) as T[];
        }

        if (hasNamedParams(params)) {
            return statement.all(params) as T[];
        }

        return statement.all() as T[];
    }
}

export class SqliteMigrationAdapter implements MigrationAdapter
{
    private readonly db: Database.Database;
    private readonly schemaVersionDao: SchemaVersionDAO;

    constructor(db: Database.Database)
    {
        this.db = db;
        this.schemaVersionDao = new SchemaVersionDAO(db);
    }

    getCurrentVersion(): number | null
    {
        return this.schemaVersionDao.get();
    }

    getRecordedMigrationState(): RecordedMigrationState
    {
        const tableRow = this.db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'migration_history'
            `)
            .get() as { name: string } | undefined;

        if (!tableRow) {
            return {
                historyTableExists: false,
                migrations: [],
            };
        }

        const migrations = this.db
            .prepare(`
                SELECT
                    version,
                    name,
                    success
                FROM migration_history
                ORDER BY id
            `)
            .all() as Array<{
                version: number;
                name: string;
                success: number;
            }>;

        return {
            historyTableExists: true,
            migrations: migrations.map((migration) => ({
                version: migration.version,
                name: migration.name,
                success: migration.success === 1,
            })),
        };
    }

    setCurrentVersion(version: number): void
    {
        this.schemaVersionDao.createMetaTable();
        this.schemaVersionDao.set(version);
    }

    runInTransaction<T>(operation: (context: MigrationExecutionContext) => T): T
    {
        const transaction = this.db.transaction(() => {
            const context = new SqliteMigrationExecutionContext(this.db);
            return operation(context);
        });

        return transaction();
    }
}
