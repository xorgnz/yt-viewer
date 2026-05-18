import type { SqlParams } from '$lib/daos/shared/DAO';
import type { RecordedMigrationState } from '$lib/daos/migrations/MigrationMetadata';

export interface MigrationExecutionContext
{
    exec(sql: string): Promise<void>;
    run(sql: string, params?: SqlParams): Promise<void>;
    get<T>(sql: string, params?: SqlParams): Promise<T | undefined>;
    all<T>(sql: string, params?: SqlParams): Promise<T[]>;
}

export interface MigrationDefinition
{
    version: number;
    name: string;
    apply(context: MigrationExecutionContext): Promise<void> | void;
}

export interface MigrationAdapter
{
    getCurrentVersion(): Promise<number | null>;
    getRecordedMigrationState(): Promise<RecordedMigrationState>;
    recordSuccessfulMigration(version: number, name: string): Promise<void>;
    setCurrentVersion(version: number): Promise<void>;
    runInTransaction<T>(operation: (context: MigrationExecutionContext) => Promise<T> | T): Promise<T>;
}
// apply-patch-anchor - do not delete
