import { describe, expect, it } from 'vitest';
import { MySqlAssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { MySqlFlagsDAO } from '../../src/lib/daos/flagsDAO';
import { MySqlHistoryDAO } from '../../src/lib/daos/historyDAO';
import { MySqlProfileDAO } from '../../src/lib/daos/profileDAO';
import { MySqlHistoryReadRepository } from '../../src/lib/daos/readers/HistoryReadRepository';
import { MySqlViewerVideoReadRepository } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import type { MySqlQueryResult } from '../../src/lib/daos/shared/MySqlPoolWrapper';
import { MySqlSourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { MySqlVideoDAO } from '../../src/lib/daos/videoDAO';
import { MySqlVirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { MySqlVirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';

type QueryCall = {
    text: string;
    values: unknown[];
};

class MockQueryProvider
{
    readonly calls: QueryCall[] = [];

    async query<T extends object>(text: string, values: unknown[] = []): Promise<MySqlQueryResult<T>>
    {
        this.calls.push({ text, values });

        return {
            affectedRows: 1,
            insertId: 42,
            rows: [
                {
                    id: 42,
                    count: 2,
                    youtube_id: 'yt-1',
                    name: 'Demo',
                }
            ] as T[],
        };
    }
}

describe('MySQL DAO modules', () => {
    it('runs DAO and reader methods through MySQL-bound SQL', async () => {
        const provider = new MockQueryProvider();

        await new MySqlSourceChannelDAO(provider).upsert({
            youtube_id: 'channel-1',
            title: 'Channel',
            description: '',
            thumbnail_url: null,
            published_at: null,
            last_refreshed_at: null,
        });
        await new MySqlVideoDAO(provider).listExistingIds([1, 2]);
        await new MySqlProfileDAO(provider).upsertByKey('default', 'Default');
        await new MySqlVirtualChannelDAO(provider).create('Queue');
        await new MySqlAssignmentDAO(provider).add(1, 2, 'all');
        await new MySqlVirtualChannelAssignmentVideoSelectionDAO(provider).setReviewState(3, 4, 'included');
        await new MySqlHistoryDAO(provider).createSession({
            video_id: 1,
            profile_id: 2,
            session_started_at: 100,
            last_updated_at: 200,
            time_watched_seconds: 30,
        });
        await new MySqlFlagsDAO(provider).set(1, 2, { watched: 1 });
        await new MySqlViewerVideoReadRepository(provider).count({ term: 'demo' }, 2);
        await new MySqlHistoryReadRepository(provider).listVideoSummaries({ profileId: 2 });

        expect(provider.calls.length).toBeGreaterThan(10);
        expect(provider.calls.every((call) => !call.text.includes('$1'))).toBe(true);
        expect(provider.calls.every((call) => !call.text.includes(':profileId'))).toBe(true);
        expect(provider.calls.every((call) => !call.text.includes('RETURNING id'))).toBe(true);
        expect(provider.calls.every((call) => !call.text.includes('::INTEGER'))).toBe(true);
        expect(provider.calls.every((call) => !call.text.includes('NULLS LAST'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('ON DUPLICATE KEY UPDATE'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('COUNT(DISTINCT v.id) AS count'))).toBe(true);
    });
});
// apply-patch-anchor - do not delete
