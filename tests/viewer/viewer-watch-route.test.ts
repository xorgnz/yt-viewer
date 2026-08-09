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
    virtualChannelId: 'vc_queue',
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
                    id: 'video-1',
                    channel_id: 'channel-2',
                    title: 'Blocked Video',
                    description: '',
                    published_at: null,
                    duration_seconds: 60,
                    thumbnail_url: null,
                    channel_title: 'Channel',
                    watched: 0,
                    favorite: 0,
                    ignored: 0
                },
                recommendations: [],
                previousVideoYoutubeId: null,
                nextVideoYoutubeId: null,
                currentVirtualChannelId: 'vc_queue',
                activeVirtualChannelTimer: {
                    serialize: vi.fn(() => ({
                        id: 'vc_queue',
                        name: 'Queue',
                        dailyTimerMax: 3600,
                        timerUsageSeconds: 3600,
                        timerRemainingSeconds: 0,
                        timerState: 'capped'
                    }))
                },
                playbackBlockedMessage: 'Daily timer limit reached for this virtual channel.',
                activeHistorySessionWatchSecondsBaseline: 0,
                activeHistorySessionLastUpdatedAt: null,
                resumePositionSeconds: null,
                navigationFilters: parseFiltersMock(),
                profileId: 'default',
                profileKey: 'default',
                profileName: 'Default'
            }
        });

        const result = await routeModule.load({
            params: { videoId: 'video-1' },
            cookies: {},
            url: new URL('http://localhost/viewer/watch/video-1?virtualChannelId=vc_queue')
        } as never);

        expect(result.playbackBlockedMessage).toBe('Daily timer limit reached for this virtual channel.');
        expect(result.activeVirtualChannel).toEqual({
            id: 'vc_queue',
            name: 'Queue',
            dailyTimerMax: 3600,
            timerUsageSeconds: 3600,
            timerRemainingSeconds: 0,
            timerState: 'capped'
        });
        expect(watchService.load).toHaveBeenCalledWith('video-1', expect.objectContaining({ virtualChannelId: 'vc_queue' }));
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
        form.set('virtualChannelId', 'vc_queue');

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
        expect(watchService.createHistorySession).toHaveBeenCalledWith('video-1', 30, 'vc_queue');
    });

    it('passes a valid playback position through the history-session create action', async () => {
        watchService.createHistorySession.mockResolvedValue({ ok: true });

        const form = new FormData();
        form.set('watchSeconds', '30');
        form.set('lastPositionSeconds', '42.9');
        form.set('virtualChannelId', 'vc_queue');

        const result = await routeModule.actions.createHistorySession({
            request: new Request('http://localhost/viewer/watch/video-1', {
                method: 'POST',
                body: form
            }),
            params: { videoId: 'video-1' },
            cookies: {}
        } as never);

        expect(result).toEqual({ ok: true });
        expect(watchService.createHistorySession).toHaveBeenCalledWith(
            'video-1',
            30,
            'vc_queue',
            undefined,
            42
        );
    });

    it('treats invalid playback positions as absent on progress updates', async () => {
        watchService.updateHistoryProgress.mockResolvedValue({ ok: true });

        const form = new FormData();
        form.set('watchSeconds', '31');
        form.set('lastPositionSeconds', '-5');
        form.set('virtualChannelId', 'vc_queue');

        const result = await routeModule.actions.updateHistoryProgress({
            request: new Request('http://localhost/viewer/watch/video-1', {
                method: 'POST',
                body: form
            }),
            params: { videoId: 'video-1' },
            cookies: {}
        } as never);

        expect(result).toEqual({ ok: true });
        expect(watchService.updateHistoryProgress).toHaveBeenCalledWith('video-1', 31, 'vc_queue');
    });
});
// apply-patch-anchor - do not delete
