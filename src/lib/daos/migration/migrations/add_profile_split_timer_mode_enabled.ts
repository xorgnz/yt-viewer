import type {MigrationDefinition} from "$lib/daos/migration/migrations/registry";

export const addProfileSplitTimerModeEnabledMigration: MigrationDefinition = {
    version: 11,
    name: 'add_profile_split_timer_mode_enabled',
    async apply(context)
    {
        await context.exec(`
            ALTER TABLE profiles
            ADD COLUMN split_timer_mode_enabled TINYINT NOT NULL DEFAULT 1
            AFTER name
        `);
    },
};
