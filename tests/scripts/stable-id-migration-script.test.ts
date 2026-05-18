import { describe, expect, it } from 'vitest';
import {
    buildStableIdMigrationPlan,
    buildStableVirtualChannelIdMappings,
    runStableIdMigrationWorkflow
} from '../../scripts/migrate_stable_ids';

type QueryCall = {
    text: string;
    values: unknown[];
};

class StableIdMigrationMockProvider
{
    readonly calls: QueryCall[] = [];

    async query<T extends Record<string, unknown>>(text: string, values: unknown[] = [])
    {
        this.calls.push({ text, values });

        if (text.includes('FROM information_schema.columns')) {
            return {
                rows: [
                    ...this.columns('source_channels', ['id', 'youtube_id', 'title', 'description', 'thumbnail_url', 'published_at', 'last_refreshed_at']),
                    ...this.columns('videos', ['id', 'youtube_id', 'channel_id', 'title', 'description', 'published_at', 'duration_seconds', 'thumbnail_url', 'length_classification']),
                    ...this.columns('virtual_channels', ['id', 'name', 'daily_timer_max']),
                    ...this.columns('virtual_channel_assignments', ['id', 'source_channel_id', 'virtual_channel_id', 'mode', 'created_at', 'updated_at']),
                    ...this.columns('virtual_channel_assignment_video_selections', ['assignment_id', 'video_id', 'review_state', 'created_at', 'updated_at']),
                    ...this.columns('profiles', ['id', 'key', 'name']),
                    ...this.columns('video_flags', ['video_id', 'profile_id', 'ignored', 'watched', 'favorite', 'updated_at']),
                    ...this.columns('watch_history', ['id', 'video_id', 'profile_id', 'session_started_at', 'last_updated_at', 'time_watched_seconds']),
                    ...this.columns('_meta', ['key', 'value'])
                ] as unknown as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        if (text.includes('FROM information_schema.tables')) {
            return {
                rows: [] as T[],
                affectedRows: 0,
                insertId: 0
            };
        }

        if (text.includes('FROM source_channels') && text.includes('COUNT(DISTINCT youtube_id)')) {
            return this.singleRow<T>({ total_count: 2, distinct_count: 2, null_count: 0 });
        }

        if (text.includes('FROM videos') && text.includes('COUNT(DISTINCT youtube_id)')) {
            return this.singleRow<T>({ total_count: 3, distinct_count: 3, null_count: 0 });
        }

        if (text.includes('FROM profiles') && text.includes('COUNT(DISTINCT `key`)')) {
            return this.singleRow<T>({ total_count: 2, distinct_count: 2, null_count: 0 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM source_channels')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM videos')) {
            return this.singleRow<T>({ total_count: 3 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM virtual_channels')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM virtual_channel_assignments')) {
            return this.singleRow<T>({ total_count: 3 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM virtual_channel_assignment_video_selections')) {
            return this.singleRow<T>({ total_count: 4 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM profiles')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM video_flags')) {
            return this.singleRow<T>({ total_count: 5 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM watch_history')) {
            return this.singleRow<T>({ total_count: 6 });
        }

        if (text.includes('SELECT id, name') && text.includes('FROM virtual_channels')) {
            return {
                rows: [
                    { id: 4, name: 'Alpha' },
                    { id: 9, name: 'Bravo' }
                ] as unknown as T[],
                affectedRows: 2,
                insertId: 0
            };
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_source_channels')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_videos')) {
            return this.singleRow<T>({ total_count: 3 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_virtual_channels')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_virtual_channel_assignments')) {
            return this.singleRow<T>({ total_count: 3 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_virtual_channel_assignment_video_selections')) {
            return this.singleRow<T>({ total_count: 4 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_profiles')) {
            return this.singleRow<T>({ total_count: 2 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_video_flags')) {
            return this.singleRow<T>({ total_count: 5 });
        }

        if (text.includes('SELECT COUNT(*) AS total_count FROM __stable_watch_history')) {
            return this.singleRow<T>({ total_count: 6 });
        }

        return {
            rows: [] as T[],
            affectedRows: 0,
            insertId: 0
        };
    }

    private columns(tableName: string, columnNames: string[]): Array<{ table_name: string; column_name: string }>
    {
        return columnNames.map((columnName) => ({
            table_name: tableName,
            column_name: columnName
        }));
    }

    private singleRow<T extends Record<string, unknown>>(row: Record<string, unknown>)
    {
        return {
            rows: [row] as T[],
            affectedRows: 1,
            insertId: 0
        };
    }
}

describe('stable-id migration script', () => {
    it('builds deterministic virtual channel ids and a shadow-table rewrite plan', () => {
        const mappings = buildStableVirtualChannelIdMappings([
            { id: 4, name: 'Alpha' },
            { id: 9, name: 'Bravo' }
        ]);
        const plan = buildStableIdMigrationPlan({
            source_channels: 2,
            videos: 3,
            virtual_channels: 2,
            virtual_channel_assignments: 3,
            virtual_channel_assignment_video_selections: 4,
            profiles: 2,
            video_flags: 5,
            watch_history: 6
        }, [
            { id: 4, name: 'Alpha' },
            { id: 9, name: 'Bravo' }
        ]);

        expect(mappings).toHaveLength(2);
        expect(mappings[0].vchannelId).toMatch(/^vc_[abcdefghjkmnpqrstvwxyz23456789]{16}$/);
        expect(mappings[1].vchannelId).toMatch(/^vc_[abcdefghjkmnpqrstvwxyz23456789]{16}$/);
        expect(mappings[0].vchannelId).not.toBe(mappings[1].vchannelId);
        expect(plan.steps.some((step) => step.sql.includes('CREATE TABLE __stable_source_channels'))).toBe(true);
        expect(plan.steps.some((step) => step.sql.includes('RENAME TABLE'))).toBe(true);
        expect(plan.steps.some((step) => step.sql.includes('legacy_source_channels'))).toBe(true);
    });

    it('executes the staged shadow-table rewrite against a representative legacy schema', async () => {
        const provider = new StableIdMigrationMockProvider();

        const result = await runStableIdMigrationWorkflow({
            pool: provider as never,
            apply: true
        });

        expect(result.applied).toBe(true);
        expect(result.mappings).toHaveLength(2);
        expect(provider.calls.some((call) => call.text.includes('CREATE TABLE __stable_virtual_channel_assignments'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('INSERT INTO __stable_vchannel_id_map'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('INSERT INTO __stable_watch_history'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('RENAME TABLE'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('SET FOREIGN_KEY_CHECKS = 0'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('SET FOREIGN_KEY_CHECKS = 1'))).toBe(true);
    });
});
