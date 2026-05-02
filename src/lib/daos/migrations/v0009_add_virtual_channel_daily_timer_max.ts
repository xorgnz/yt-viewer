import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

export const addVirtualChannelDailyTimerMaxMigration: MigrationDefinition = {
    version: 9,
    name: 'add_virtual_channel_daily_timer_max',
    async apply(context) {
        await context.exec(`
ALTER TABLE virtual_channels
ADD COLUMN daily_timer_max INT DEFAULT NULL
`);
    },
};
// apply-patch-anchor - do not delete
