import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type WatchRouteModule = typeof import('../../src/routes/viewer/watch/[videoId]/+page.server');

const fakeDb = {};
const runMock = vi.fn(async (work: (context: { db: typeof fakeDb }) => unknown) => await work({ db: fakeDb }));
const watchService = {
    load: vi.fn(),
    createHistorySession: vi.fn(),
    updateHistoryProgress: vi.fn(),
    setWatched: vi.fn()
};
const resolveServiceContextMock = vi.fn(async () => ({
    profileContext: {
        activeProfileKey: 'default'
    },
    watchService,
    flagService: {
        toggleFlag: vi.fn()
    }
}));
const parseFiltersMock = vi.fn(() => ({
    watched: 'all',
    ignored: 'hide',
    dateFrom: null,
    dateTo: null,
    dateFromInput: '',
    dateToInput: '',
    channelId: null,
    virtualChannelId: 5,
    sort: 'newest',
    limit: 200,
    offset: 0
}));

vi.mock('$lib/server/ServerDatabaseContext', () => ({
    ServerDatabaseContext: {
        run: runMock
    }
}));

vi.mock('$lib/server/viewer/ViewerServiceContext', () => ({
    ViewerServiceContext: {
        resolve: resolveServiceContextMock
    }
}));

vi.mock('$lib/server/viewer/ViewerQueryParser', () => ({
    ViewerQueryParser: {
        parse: parseFiltersMock
    }
}));

describe('viewer watch route', () => {
    let routeModule: WatchRouteModule;

    beforeAll(async () => {
        routeModule = await import('../../src/routes/viewer/watch/[videoId]/+page.server');
    });

    beforeEach(() => {
        runMock.mockClear();
        resolveServiceContextMock.mockClear();
        parseFiltersMock.mockClear();
        watchService.load.mockReset();
        watchService.createHistorySession.mockReset();
        watchService.updateHistoryProgress.mockReset();
        watchService.setWatched.mockReset();
    });

    it('returns a blocked-playback page model when the selected virtual channel is capped', async () => {
        watchService.load.mockResolvedValue({
            ok: true,
            data: {
                video: {
                    id: 1,
                    youtube_id: 'video-1',
                    channel_id: 2,
                    title: 'Blocked Video',
                    description: '',
                    published_at: null,
                    duration_seconds: 60,
                    thumbnail_url: null,
                    channel_title: 'Channel',
                    channel_youtube_id: 'channel-2',
                    watched: 0,
                    favorite: 0,
                    ignored: 0
                },
                recommendations: [],
                previousVideoYoutubeId: null,
                nextVideoYoutubeId: null,
                currentVirtualChannelId: 5,
                playbackBlockedMessage: 'Daily timer limit reached for this virtual channel.',
                navigationFilters: parseFiltersMock(),
                profileId: 3,
                profileKey: 'default',
                profileName: 'Default'
            }
        });

        const result = await routeModule.load({
            params: { videoId: 'video-1' },
            cookies: {},
            url: new URL('http://localhost/viewer/watch/video-1?virtualChannelId=5')
        } as never);

        expect(result.playbackBlockedMessage).toBe('Daily timer limit reached for this virtual channel.');
        expect(watchService.load).toHaveBeenCalledWith('video-1', expect.objectContaining({ virtualChannelId: 5 }));
    });

    it('returns a timer-capped failure payload from the history-session action', async () => {
        watchService.createHistorySession.mockResolvedValue({
            ok: false,
            status: 409,
            message: 'Virtual channel timer limit reached',
            code: 'timer_capped'
        });

        const form = new FormData();
        form.set('watchSeconds', '30');
        form.set('virtualChannelId', '5');

        const result = await routeModule.actions.createHistorySession({
            request: new Request('http://localhost/viewer/watch/video-1', {
                method: 'POST',
                body: form
            }),
            params: { videoId: 'video-1' },
            cookies: {}
        } as never);

        if (!('status' in result) || !('data' in result)) {
            throw new Error('Expected an ActionFailure from the capped timer action.');
        }

        expect(result.status).toBe(409);
        expect(result.data).toEqual({
            message: 'Virtual channel timer limit reached',
            code: 'timer_capped',
            timerState: 'capped'
        });
        expect(watchService.createHistorySession).toHaveBeenCalledWith('video-1', 30, 5);
    });
});
// apply-patch-anchor - do not delete
