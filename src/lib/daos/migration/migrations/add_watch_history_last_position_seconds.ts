import type {MigrationDefinition} from "$lib/daos/migration/migrations/registry";

export const addWatchHistoryLastPositionSecondsMigration: MigrationDefinition = {
    version: 12,
    name: 'add_watch_history_last_position_seconds',
    async apply(context)
    {
        await context.exec(`
            ALTER TABLE watch_history
            ADD COLUMN last_position_seconds INT DEFAULT NULL
            AFTER time_watched_seconds
        `);
    },
};
