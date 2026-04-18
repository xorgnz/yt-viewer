import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';
import { PostgresAssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { PostgresFlagsDAO } from '../../src/lib/daos/flagsDAO';
import { PostgresHistoryDAO } from '../../src/lib/daos/historyDAO';
import { PostgresProfileDAO } from '../../src/lib/daos/profileDAO';
import { PostgresHistoryReadRepository } from '../../src/lib/daos/readers/HistoryReadRepository';
import { PostgresViewerVideoReadRepository } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import { PostgresSourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { PostgresVideoDAO } from '../../src/lib/daos/videoDAO';
import { PostgresVirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { PostgresVirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';

type QueryCall = {
    text: string;
    values: unknown[];
};

class MockQueryProvider
{
    readonly calls: QueryCall[] = [];

    async query<T extends QueryResultRow>(text: string, values: unknown[]): Promise<QueryResult<T>>
    {
        this.calls.push({ text, values });

        return {
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
            rows: [
                {
                    id: 42,
                    count: 2,
                    youtube_id: 'yt-1',
                    name: 'Demo',
                }
            ] as unknown as T[],
        };
    }
}

describe('Postgres DAO modules', () => {
    it('runs DAO and reader methods through Postgres-bound SQL', async () => {
        const provider = new MockQueryProvider();

        await new PostgresSourceChannelDAO(provider).upsert({
            youtube_id: 'channel-1',
            title: 'Channel',
            description: '',
            thumbnail_url: null,
            published_at: null,
            last_refreshed_at: null,
        });
        await new PostgresVideoDAO(provider).listExistingIds([1, 2]);
        await new PostgresProfileDAO(provider).upsertByKey('default', 'Default');
        await new PostgresVirtualChannelDAO(provider).create('Queue');
        await new PostgresAssignmentDAO(provider).add(1, 2, 'all');
        await new PostgresVirtualChannelAssignmentVideoSelectionDAO(provider).setReviewState(3, 4, 'included');
        await new PostgresHistoryDAO(provider).createSession({
            video_id: 1,
            profile_id: 2,
            session_started_at: 100,
            last_updated_at: 200,
            time_watched_seconds: 30,
        });
        await new PostgresFlagsDAO(provider).set(1, 2, { watched: 1 });
        await new PostgresViewerVideoReadRepository(provider).count({ term: 'demo' }, 2);
        await new PostgresHistoryReadRepository(provider).listVideoSummaries({ profileId: 2 });

        expect(provider.calls.length).toBeGreaterThan(10);
        expect(provider.calls.every((call) => !call.text.includes('?'))).toBe(true);
        expect(provider.calls.every((call) => !call.text.includes(':profileId'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('RETURNING id'))).toBe(true);
        expect(provider.calls.some((call) => call.text.includes('COUNT(DISTINCT v.id)::INTEGER'))).toBe(true);
    });
});
