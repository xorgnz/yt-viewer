import type { AsyncMigrationDefinition, MigrationDefinition } from '$lib/daos/migrations/migrationTypes';
import {
    addMigrationHistoryMigration,
    addPostgresMigrationHistoryMigration
} from '$lib/daos/migrations/v0008_add_migration_history';

export const MIGRATIONS: MigrationDefinition[] = [
    addMigrationHistoryMigration,
];

export const POSTGRES_MIGRATIONS: AsyncMigrationDefinition[] = [
    addPostgresMigrationHistoryMigration,
];
