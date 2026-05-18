import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';
import { addVirtualChannelExtraTimerSecondsRemainingMigration } from '$lib/daos/migrations/add_virtual_channel_extra_timer_seconds_remaining';

export const MIGRATIONS: MigrationDefinition[] = [
    addVirtualChannelExtraTimerSecondsRemainingMigration,
];
// apply-patch-anchor - do not delete
