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

    private validateRecordedState(
        currentVersion: number,
        firstRegisteredVersion: number,
        targetVersion: number
    ): void
    {
        const recordedState = this.adapter.getRecordedMigrationState();
        const registeredByVersion = new Map(this.migrations.map((migration) => [migration.version, migration.name]));

        if (!recordedState.historyTableExists) {
            if (currentVersion >= firstRegisteredVersion) {
                throw new Error('Migration metadata table is missing for a version that should already include it.');
            }

            return;
        }

        if (currentVersion < firstRegisteredVersion) {
            throw new Error('Migration metadata exists for a database version that predates supported migrations.');
        }

        const successfulMigrations = recordedState.migrations.filter((migration) => migration.success);
        const failedMigrations = recordedState.migrations.filter((migration) => !migration.success);
        const seenSuccessfulVersions = new Set<number>();

        if (failedMigrations.length > 0) {
            throw new Error('Migration metadata contains failed migration attempts. Refusing to continue.');
        }

        for (const migration of successfulMigrations) {
            if (seenSuccessfulVersions.has(migration.version)) {
                throw new Error(`Migration metadata contains duplicate successful version "${migration.version}".`);
            }

            seenSuccessfulVersions.add(migration.version);

            const registeredName = registeredByVersion.get(migration.version);
            if (!registeredName) {
                throw new Error(`Migration metadata references unsupported version "${migration.version}".`);
            }

            if (registeredName !== migration.name) {
                throw new Error(
                    `Migration metadata name mismatch for version "${migration.version}": expected "${registeredName}", found "${migration.name}".`
                );
            }
        }

        if (successfulMigrations.length === 0) {
            if (currentVersion !== targetVersion) {
                throw new Error('Migration metadata is empty for a database that is not already at the latest supported version.');
            }

            return;
        }

        const highestSuccessfulVersion = successfulMigrations.reduce(
            (highest, migration) => Math.max(highest, migration.version),
            successfulMigrations[0].version
        );

        if (highestSuccessfulVersion !== currentVersion) {
            throw new Error(
                `Current schema version "${currentVersion}" does not match recorded migration history "${highestSuccessfulVersion}".`
            );
        }
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
        const firstRegisteredVersion = this.migrations[0].version;

        if (currentVersion > targetVersion) {
            throw new Error(
                `Database schema version "${currentVersion}" is newer than the latest supported version "${targetVersion}".`
            );
        }

        this.validateRecordedState(currentVersion, firstRegisteredVersion, targetVersion);

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
