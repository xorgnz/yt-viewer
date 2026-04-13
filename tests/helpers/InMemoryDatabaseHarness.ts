import Database from 'better-sqlite3';
import { LatestSchemaBootstrapper } from '$lib/daos/shared/LatestSchemaBootstrap';

export class InMemoryDatabaseHarness
{
    readonly db: Database.Database;

    private constructor(db: Database.Database)
    {
        this.db = db;
    }

    static createEmpty(): InMemoryDatabaseHarness
    {
        return new InMemoryDatabaseHarness(new Database(':memory:'));
    }

    static createWithLatestSchema(): InMemoryDatabaseHarness
    {
        const harness = InMemoryDatabaseHarness.createEmpty();
        new LatestSchemaBootstrapper().apply(harness.db);
        return harness;
    }

    close(): void
    {
        this.db.close();
    }
}
