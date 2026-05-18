import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

export const addVirtualChannelExtraTimerSecondsRemainingMigration: MigrationDefinition = {
    version: 10,
    name: 'add_virtual_channel_extra_timer_seconds_remaining',
    async apply(context)
    {
        await context.exec(`
            ALTER TABLE virtual_channels
            ADD COLUMN extra_timer_seconds_remaining INT NOT NULL DEFAULT 0
            AFTER daily_timer_max
        `);
    },
};
