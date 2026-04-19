export type SqlParams = unknown[] | Record<string, unknown>;

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

export interface AppliedMigrationSummary
{
    version: number;
    name: string;
}

export interface RecordedMigrationSummary extends AppliedMigrationSummary
{
    success: boolean;
}

export interface RecordedMigrationState
{
    historyTableExists: boolean;
    migrations: RecordedMigrationSummary[];
}

export interface MigrationRunResult
{
    currentVersion: number;
    targetVersion: number;
    appliedMigrations: AppliedMigrationSummary[];
    finalVersion: number;
}
// apply-patch-anchor - do not delete
