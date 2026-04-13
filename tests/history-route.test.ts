import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from './helpers/RouteDatabaseHarness';
import {
    insertProfile,
    insertSourceChannel,
    insertVideo
} from './helpers/TestFixtureBuilders';

type HistoryRouteModule = typeof import('../src/routes/history/+page.server');

describe('history page load', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: HistoryRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-history-route-');

        insertProfile(harness.db, { id: 1, key: 'default', name: 'Default' });
        insertSourceChannel(harness.db, {
            id: 1,
            youtubeId: 'UC_H1',
            title: 'History Source 1',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(harness.db, {
            id: 2,
            youtubeId: 'UC_H2',
            title: 'History Source 2',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVideo(harness.db, {
            id: 1,
            youtubeId: 'VID_H1',
            channelId: 1,
            title: 'History Video 1',
            description: '',
            publishedAt: null,
            durationSeconds: 200,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(harness.db, {
            id: 2,
            youtubeId: 'VID_H2',
            channelId: 2,
            title: 'History Video 2',
            description: '',
            publishedAt: null,
            durationSeconds: 120,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        harness.db.prepare(`
            INSERT INTO watch_history(id, video_id, profile_id, session_started_at, last_updated_at, time_watched_seconds)
            VALUES
                (1, 1, 1, 1700000000000, 1700000009000, 12),
                (2, 1, 1, 1700000600000, 1700000615000, 30),
                (3, 2, 1, 1700000300000, 1700000310000, 18)
        `).run();

        routeModule = await import('../src/routes/history/+page.server');
    });

    afterEach(() => {
        harness.dispose();
    });

    function cookieJar()
    {
        return {
            get(name: string) {
                if (name === 'ytcw_active_profile') return 'default';
                return undefined;
            }
        };
    }

    it('loads chronological session history by default', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/history'),
            cookies: cookieJar()
        } as any);

        expect(result.filters.mode).toBe('sessions');
        expect(result.items).toHaveLength(3);
        expect(result.items[0]).toMatchObject({
            title: 'History Video 1',
            session_started_at: 1700000600000,
            last_updated_at: 1700000615000,
            time_watched_seconds: 30
        });
    });

    it('loads per-video summary history when mode=videos', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/history?mode=videos'),
            cookies: cookieJar()
        } as any);

        expect(result.filters.mode).toBe('videos');
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toMatchObject({
            title: 'History Video 1',
            session_count: 2,
            total_time_watched_seconds: 42,
            latest_session_started_at: 1700000600000
        });
        expect(result.sessionItems).toHaveLength(3);
    });
});
