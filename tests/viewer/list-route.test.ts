import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from '../helpers/RouteDatabaseHarness';
import {
    insertProfile,
    insertSourceChannel,
    insertVideo,
    insertVideoFlag
} from '../helpers/TestFixtureBuilders';

type ViewerListRouteModule = typeof import('../../src/routes/viewer/+page.server');

describe('viewer list page load', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: ViewerListRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-viewer-route-');
        const { db } = harness;

        insertProfile(db, { id: 1, key: 'default', name: 'Default' });
        insertProfile(db, { id: 2, key: 'child', name: 'Child' });
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_VIEWER',
            title: 'Viewer Source',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_UNWATCHED',
            channelId: 1,
            title: 'Unwatched Video',
            description: '',
            publishedAt: null,
            durationSeconds: 100,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 2,
            youtubeId: 'VID_WATCHED',
            channelId: 1,
            title: 'Watched Video',
            description: '',
            publishedAt: null,
            durationSeconds: 100,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideoFlag(db, { videoId: 2, profileId: 2, watched: 1, ignored: 0, favorite: 0 });
        db.close();

        routeModule = await import('../../src/routes/viewer/+page.server');
    });

    afterEach(() => {
        harness.dispose();
    });

    function childCookieJar()
    {
        return {
            get(name: string) {
                if (name === 'ytcw_active_profile') return 'child';
                return undefined;
            }
        };
    }

    it('defaults the child profile viewer to unwatched videos', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/viewer'),
            cookies: childCookieJar()
        } as any);

        expect(result.filters.watched).toBe('unwatched');
        expect(result.videos.map((video: { youtube_id: string }) => video.youtube_id)).toEqual(['VID_UNWATCHED']);
    });

    it('allows an explicit watched=all request to override the child default', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/viewer?watched=all'),
            cookies: childCookieJar()
        } as any);

        expect(result.filters.watched).toBe('all');
        expect(result.videos.map((video: { youtube_id: string }) => video.youtube_id).sort()).toEqual([
            'VID_UNWATCHED',
            'VID_WATCHED'
        ].sort());
    });
});
