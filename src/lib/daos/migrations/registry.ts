import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';
import { addMigrationHistoryMigration } from '$lib/daos/migrations/v0008_add_migration_history';

export const MIGRATIONS: MigrationDefinition[] = [
    addMigrationHistoryMigration,
];
// apply-patch-anchor - do not delete
