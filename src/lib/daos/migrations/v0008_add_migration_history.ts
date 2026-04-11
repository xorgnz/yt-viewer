import { CREATE_TABLE_MIGRATION_HISTORY } from '$lib/daos/_schema';
import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

export const addMigrationHistoryMigration: MigrationDefinition = {
    version: 8,
    name: 'add_migration_history',
    apply(context) {
        context.exec(CREATE_TABLE_MIGRATION_HISTORY);
    },
};
