import type { DatabaseMigrationAdapter, RecordedMigrationState } from '$lib/daos/migration/MigrationAdapter';
import type {MigrationDefinition} from "$lib/daos/migration/migrations/registry";

export interface AppliedMigration
{
    version: number;
    name: string;
}

export interface MigrationRunResult
{
    currentVersion: number;
    targetVersion: number;
    appliedMigrations: AppliedMigration[];
    finalVersion: number;
}

type RegisteredMigration = {
    version: number;
    name: string;
};

const LEGACY_RECORDED_MIGRATIONS = new Map<number, string>([
    [8, 'add_migration_history'],
    [9, 'add_virtual_channel_daily_timer_max'],
]);

type RecordedMigrationNameResolver = (version: number) => string | null;

function sortMigrations<T extends RegisteredMigration>(migrations: T[]): T[]
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

function validateSuccessfulRecordedMigrations(
    recordedState: RecordedMigrationState,
    resolveExpectedName: RecordedMigrationNameResolver,
    unsupportedVersionMessage: (version: number) => string,
    mismatchMessage: (version: number, expectedName: string, actualName: string) => string
): number | null
{
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

        const expectedName = resolveExpectedName(migration.version);
        if (!expectedName) {
            throw new Error(unsupportedVersionMessage(migration.version));
        }

        if (expectedName !== migration.name) {
            throw new Error(mismatchMessage(migration.version, expectedName, migration.name));
        }
    }

    if (successfulMigrations.length === 0) {
        return null;
    }

    return successfulMigrations.reduce(
        (highest, migration) => Math.max(highest, migration.version),
        successfulMigrations[0].version
    );
}

function validateLegacyRecordedState(recordedState: RecordedMigrationState, currentVersion: number): void
{
    const highestSuccessfulVersion = validateSuccessfulRecordedMigrations(
        recordedState,
        (version) => LEGACY_RECORDED_MIGRATIONS.get(version) ?? null,
        (version) => `Migration metadata references unsupported legacy version "${version}".`,
        (version, expectedName, actualName) => (
            `Legacy migration metadata name mismatch for version "${version}": expected "${expectedName}", found "${actualName}".`
        )
    );

    if (highestSuccessfulVersion != null && highestSuccessfulVersion !== currentVersion) {
        throw new Error(
            `Current schema version "${currentVersion}" does not match legacy migration history "${highestSuccessfulVersion}".`
        );
    }
}

function resolveRecordedMigrationName(
    version: number,
    registeredByVersion: Map<number, string>
): string | null
{
    return registeredByVersion.get(version) ?? LEGACY_RECORDED_MIGRATIONS.get(version) ?? null;
}

function validateRecordedState(
    recordedState: RecordedMigrationState,
    migrations: RegisteredMigration[],
    currentVersion: number,
    firstRegisteredVersion: number,
    targetVersion: number
): void
{
    const registeredByVersion = new Map(migrations.map((migration) => [migration.version, migration.name]));

    if (!recordedState.historyTableExists) {
        if (currentVersion >= firstRegisteredVersion) {
            throw new Error('Migration metadata table is missing for a version that should already include it.');
        }

        return;
    }

    if (currentVersion < firstRegisteredVersion) {
        validateLegacyRecordedState(recordedState, currentVersion);
        return;
    }

    const highestSuccessfulVersion = validateSuccessfulRecordedMigrations(
        recordedState,
        (version) => resolveRecordedMigrationName(version, registeredByVersion),
        (version) => `Migration metadata references unsupported version "${version}".`,
        (version, expectedName, actualName) => (
            `Migration metadata name mismatch for version "${version}": expected "${expectedName}", found "${actualName}".`
        )
    );

    if (highestSuccessfulVersion == null) {
        if (currentVersion === targetVersion) {
            return;
        }

        if (currentVersion === firstRegisteredVersion) {
            return;
        }

        if (currentVersion !== targetVersion) {
            throw new Error('Migration metadata is empty for a database that is not already at the latest supported version.');
        }
        return;
    }

    if (highestSuccessfulVersion !== currentVersion) {
        throw new Error(
            `Current schema version "${currentVersion}" does not match recorded migration history "${highestSuccessfulVersion}".`
        );
    }
}

export class MigrationRunner
{
    private readonly adapter: DatabaseMigrationAdapter;
    private readonly migrations: MigrationDefinition[];

    constructor(adapter: DatabaseMigrationAdapter, migrations: MigrationDefinition[])
    {
        this.adapter = adapter;
        this.migrations = sortMigrations(migrations);
    }

    async runToLatest(): Promise<MigrationRunResult>
    {
        const currentVersion = await this.adapter.getCurrentVersion();

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

        const targetVersion = this.migrations[this.migrations.length - 1].version;
        const firstRegisteredVersion = this.migrations[0].version;

        if (currentVersion > targetVersion) {
            throw new Error(
                `Database schema version "${currentVersion}" is newer than the latest supported version "${targetVersion}".`
            );
        }

        validateRecordedState(
            await this.adapter.getRecordedMigrationState(),
            this.migrations,
            currentVersion,
            firstRegisteredVersion,
            targetVersion
        );

        const pendingMigrations = this.migrations.filter((migration) => migration.version > currentVersion);
        const appliedMigrations: MigrationRunResult['appliedMigrations'] = [];
        let finalVersion = currentVersion;

        for (const migration of pendingMigrations) {
            if (migration.version !== finalVersion + 1) {
                throw new Error(
                    `No supported migration path from version "${finalVersion}" to version "${migration.version}".`
                );
            }

            await this.adapter.runInTransaction(async (context) => {
                await migration.apply(context);
                await this.adapter.recordSuccessfulMigration(migration.version, migration.name);
                await this.adapter.setCurrentVersion(migration.version);
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
// apply-patch-anchor - do not delete
