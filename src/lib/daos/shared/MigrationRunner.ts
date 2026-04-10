import type {
    MigrationAdapter,
    MigrationDefinition,
    MigrationRunResult,
} from '$lib/daos/migrations/migrationTypes';

function sortMigrations(migrations: MigrationDefinition[]): MigrationDefinition[]
{
    const ordered = [...migrations].sort((left, right) => left.version - right.version);

    // Reject invalid migration version sequences before touching the database.
    for (let index = 0; index < ordered.length; index++) {
        const migration = ordered[index];

        if (!Number.isInteger(migration.version) || migration.version <= 0) {
            throw new Error(`Migration "${migration.name}" has invalid version "${migration.version}".`);
        }

        if (index === 0) {
            continue;
        }

        const previous = ordered[index - 1];
        if (previous.version === migration.version) {
            throw new Error(`Duplicate migration version "${migration.version}" detected.`);
        }
    }

    return ordered;
}

export class MigrationRunner
{
    private readonly adapter: MigrationAdapter;
    private readonly migrations: MigrationDefinition[];

    constructor(adapter: MigrationAdapter, migrations: MigrationDefinition[])
    {
        this.adapter = adapter;
        this.migrations = sortMigrations(migrations);
    }

    runToLatest(): MigrationRunResult
    {
        // Discover the current state before deciding whether any work is required.
        const currentVersion = this.adapter.getCurrentVersion();

        if (currentVersion === null) {
            throw new Error('Database schema version is unknown.');
        }

        if (!Number.isInteger(currentVersion) || currentVersion < 0) {
            throw new Error(`Database schema version "${currentVersion}" is invalid.`);
        }

        if (this.migrations.length === 0) {
            return {
                currentVersion,
                targetVersion: currentVersion,
                appliedMigrations: [],
                finalVersion: currentVersion,
            };
        }

        // Compute the only supported destination and validate the source state.
        const targetVersion = this.migrations[this.migrations.length - 1].version;

        if (currentVersion > targetVersion) {
            throw new Error(
                `Database schema version "${currentVersion}" is newer than the latest supported version "${targetVersion}".`
            );
        }

        const pendingMigrations = this.migrations.filter((migration) => migration.version > currentVersion);
        const appliedMigrations: MigrationRunResult['appliedMigrations'] = [];
        let finalVersion = currentVersion;

        // Apply each migration as an independent forward-only step.
        for (const migration of pendingMigrations) {
            if (migration.version !== finalVersion + 1) {
                throw new Error(
                    `No supported migration path from version "${finalVersion}" to version "${migration.version}".`
                );
            }

            this.adapter.runInTransaction((context) => {
                migration.apply(context);
                this.adapter.setCurrentVersion(migration.version);
            });

            appliedMigrations.push({
                version: migration.version,
                name: migration.name,
            });

            finalVersion = migration.version;
        }

        return {
            currentVersion,
            targetVersion,
            appliedMigrations,
            finalVersion,
        };
    }
}
