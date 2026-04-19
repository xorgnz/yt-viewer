import { CREATE_TABLE_MIGRATION_HISTORY } from '$lib/daos/_schema';
import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

export const addMigrationHistoryMigration: MigrationDefinition = {
    version: 8,
    name: 'add_migration_history',
    async apply(context) {
        await context.exec(CREATE_TABLE_MIGRATION_HISTORY);
    },
};
// apply-patch-anchor - do not delete
