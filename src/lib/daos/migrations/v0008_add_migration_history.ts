import { CREATE_TABLE_MIGRATION_HISTORY, POSTGRES_CREATE_TABLE_MIGRATION_HISTORY } from '$lib/daos/_schema';
import type { AsyncMigrationDefinition, MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

export const addMigrationHistoryMigration: MigrationDefinition = {
    version: 8,
    name: 'add_migration_history',
    apply(context) {
        context.exec(CREATE_TABLE_MIGRATION_HISTORY);
    },
};

export const addPostgresMigrationHistoryMigration: AsyncMigrationDefinition = {
    version: 8,
    name: 'add_migration_history',
    async apply(context) {
        await context.exec(POSTGRES_CREATE_TABLE_MIGRATION_HISTORY);
    },
};
// apply-patch-anchor - do not delete