import Database from 'better-sqlite3';
import fs from 'node:fs';
import { MIGRATIONS } from '$lib/daos/migrations/registry';
import type { MigrationDefinition, MigrationRunResult } from '$lib/daos/migrations/migrationTypes';
import { DatabaseFileLayout } from '$lib/daos/shared/DatabaseFileLayout';
import { MigrationRunner } from '$lib/daos/shared/MigrationRunner';
import { SqliteMigrationAdapter } from '$lib/daos/shared/SqliteMigrationAdapter';

export type DatabaseMigrationWorkflowOptions = {
    dbPath: string;
    migrations?: MigrationDefinition[];
};

export type DatabaseMigrationWorkflowResult = {
    backupPath: string;
    failedArtifactPath: string | null;
    migrationResult: MigrationRunResult;
};

export class DatabaseMigrationWorkflow
{
    private readonly fileLayout: DatabaseFileLayout;
    private readonly defaultMigrations: MigrationDefinition[];

    constructor(
        fileLayout: DatabaseFileLayout = new DatabaseFileLayout(),
        defaultMigrations: MigrationDefinition[] = MIGRATIONS
    )
    {
        this.fileLayout = fileLayout;
        this.defaultMigrations = defaultMigrations;
    }

    run(options: DatabaseMigrationWorkflowOptions): DatabaseMigrationWorkflowResult
    {
        const migrations = options.migrations || this.defaultMigrations;

        if (!fs.existsSync(options.dbPath)) {
            throw new Error(`Database file not found at: ${options.dbPath}.`);
        }

        const backupPath = this.createPreMigrationBackup(options.dbPath);
        let db: Database.Database | null = new Database(options.dbPath);

        try {
            const runner = new MigrationRunner(new SqliteMigrationAdapter(db), migrations);
            const migrationResult = runner.runToLatest();

            return {
                backupPath,
                failedArtifactPath: null,
                migrationResult
            };
        } catch (error) {
            if (db) {
                db.close();
                db = null;
            }

            const failedArtifactPath = this.fileLayout.createTimestampedArtifactPath(options.dbPath, 'failed');
            fs.copyFileSync(options.dbPath, failedArtifactPath);
            fs.copyFileSync(backupPath, options.dbPath);

            throw new Error(
                `Migration failed. Restored database: ${options.dbPath}. Backup: ${backupPath}. Failed artifact: ${failedArtifactPath}. ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            if (db) {
                db.close();
            }
        }
    }

    private createPreMigrationBackup(dbPath: string): string
    {
        const backupPath = this.fileLayout.createTimestampedArtifactPath(dbPath, 'bak');
        fs.copyFileSync(dbPath, backupPath);
        return backupPath;
    }
}
