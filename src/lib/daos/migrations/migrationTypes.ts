export type SqlParams = unknown[] | Record<string, unknown>;

export interface MigrationExecutionContext
{
    exec(sql: string): void;
    run(sql: string, params?: SqlParams): void;
    get<T>(sql: string, params?: SqlParams): T | undefined;
    all<T>(sql: string, params?: SqlParams): T[];
}

export interface MigrationDefinition
{
    version: number;
    name: string;
    apply(context: MigrationExecutionContext): void;
}

export interface MigrationAdapter
{
    getCurrentVersion(): number | null;
    getRecordedMigrationState(): RecordedMigrationState;
    recordSuccessfulMigration(version: number, name: string): void;
    setCurrentVersion(version: number): void;
    runInTransaction<T>(operation: (context: MigrationExecutionContext) => T): T;
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
