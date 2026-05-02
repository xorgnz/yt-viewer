import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';
import { addMigrationHistoryMigration } from '$lib/daos/migrations/v0008_add_migration_history';
import { addVirtualChannelDailyTimerMaxMigration } from '$lib/daos/migrations/v0009_add_virtual_channel_daily_timer_max';

export const MIGRATIONS: MigrationDefinition[] = [
    addMigrationHistoryMigration,
    addVirtualChannelDailyTimerMaxMigration,
];
// apply-patch-anchor - do not delete
