import {addProfileSplitTimerModeEnabledMigration} from '$lib/daos/migration/migrations/add_profile_split_timer_mode_enabled';
import {addWatchHistoryLastPositionSecondsMigration} from '$lib/daos/migration/migrations/add_watch_history_last_position_seconds';
import {addVirtualChannelExtraTimerSecondsRemainingMigration} from '$lib/daos/migration/migrations/add_virtual_channel_extra_timer_seconds_remaining';

import type {DatabaseMigrationExecutionContext} from "$lib/daos/migration/MigrationAdapter";

export interface MigrationDefinition
{
    version: number;
    name: string;
    apply(context: DatabaseMigrationExecutionContext): Promise<void> | void;
}

export const MIGRATIONS: MigrationDefinition[] = [
    addVirtualChannelExtraTimerSecondsRemainingMigration,
    addProfileSplitTimerModeEnabledMigration,
    addWatchHistoryLastPositionSecondsMigration,
];
// apply-patch-anchor - do not delete
