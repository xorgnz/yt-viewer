export interface RecordedMigration
{
    version: number;
    name: string;
    success: boolean;
}

export interface RecordedMigrationState
{
    historyTableExists: boolean;
    migrations: RecordedMigration[];
}
// apply-patch-anchor - do not delete
