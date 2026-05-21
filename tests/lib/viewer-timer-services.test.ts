import { describe, expect, it, vi } from 'vitest';
import type { ViewerVideoRecord } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';
import { ViewerRecommendationService } from '../../src/lib/server/viewer/ViewerRecommendationService';
import { ViewerVirtualChannelService } from '../../src/lib/server/viewer/ViewerVirtualChannelService';
import { ViewerWatchService } from '../../src/lib/server/viewer/ViewerWatchService';
import {
    ViewerIgnoredFilter,
    ViewerSort,
    ViewerVirtualChannelTimerState,
    ViewerWatchedFilter
} from '../../src/lib/viewer/types';

function createVideo(id: number): ViewerVideoRecord
{
    return {
        id: `video-${id}`,
        youtube_id: `video-${id}`,
        channel_id: 'channel-7',
        title: `Video ${id}`,
        description: '',
        published_at: id * 1000,
        duration_seconds: 90,
        thumbnail_url: null,
        length_classification: 'short',
        channel_title: 'Channel',
        channel_youtube_id: 'channel-7',
        watched: 0,
        favorite: 0,
        ignored: 0
    };
}

function createProfileContext()
{
    return {
        activeProfileId: 11,
        activeProfileKey: 'default',
        activeProfileName: 'Default'
    } as any;
}

describe('viewer timer services', () => {
    it('derives unlimited and capped virtual-channel timer states from watch-history aggregates', async () => {
        const list = vi.fn(async () => ([
            new VirtualChannel({ id: '1', name: 'Unlimited', dailyTimerMax: null, extraTimerSecondsRemaining: 0 }),
            new VirtualChannel({ id: '2', name: 'Capped', dailyTimerMax: 60, extraTimerSecondsRemaining: 0 })
        ]));
        const historyDAO = {
            getVirtualChannelWatchSecondsInWindow: vi.fn(async (_profileId: number, virtualChannelId: string | number) => {
                return String(virtualChannelId) === '2' ? 60 : 0;
            }),
            resetVirtualChannelWatchSecondsInWindow: vi.fn(async () => undefined)
        };
        const service = new ViewerVirtualChannelService(
            { get: vi.fn(), list } as never,
            historyDAO as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        const virtualChannels = await service.loadVirtualChannels();

        expect(virtualChannels).toHaveLength(2);
        expect(virtualChannels[0]).toMatchObject({
            id: '1',
            timerState: ViewerVirtualChannelTimerState.Unlimited,
            timerUsageSeconds: 0,
            timerRemainingSeconds: null,
            dailyTimerRemainingSeconds: null,
            extraTimerSecondsRemaining: 0,
            combinedTimerRemainingSeconds: null
        });
        expect(virtualChannels[1]).toMatchObject({
            id: '2',
            timerState: ViewerVirtualChannelTimerState.Capped,
            timerUsageSeconds: 60,
            timerRemainingSeconds: 0,
            dailyTimerRemainingSeconds: 0,
            extraTimerSecondsRemaining: 0,
            combinedTimerRemainingSeconds: 0
        });
        expect(historyDAO.getVirtualChannelWatchSecondsInWindow).toHaveBeenCalledTimes(1);
        expect(historyDAO.getVirtualChannelWatchSecondsInWindow).toHaveBeenCalledWith(
            11,
            '2',
            expect.any(Number),
            expect.any(Number)
        );
    });

    it('loads a watch page model with a playback-blocked message for capped virtual channels', async () => {
        const video = createVideo(3);
        const viewerVideoReadRepository = {
            getByYoutubeId: vi.fn(async () => video),
            findAdjacentYoutubeIds: vi.fn(async () => ({
                previousYoutubeId: null,
                nextYoutubeId: 'video-4'
            })),
            list: vi.fn(async () => [])
        };
        const recommendationService = new ViewerRecommendationService(
            { list: viewerVideoReadRepository.list } as never,
            11
        );
        const service = new ViewerWatchService(
            viewerVideoReadRepository as never,
            {} as never,
            {} as never,
            createProfileContext(),
            recommendationService,
            {
                getVirtualChannelById: vi.fn(async () => ({
                    id: '8',
                    name: 'Timers',
                    dailyTimerMax: 60,
                    timerState: ViewerVirtualChannelTimerState.Capped,
                    timerUsageSeconds: 60,
                    timerRemainingSeconds: 0,
                    dailyTimerRemainingSeconds: 0,
                    extraTimerSecondsRemaining: 0,
                    combinedTimerRemainingSeconds: 0,
                    timerWindowStartMs: 100,
                    timerWindowEndMs: 200
                }))
            } as never
        );

        const result = await service.load('video-3', {
            watched: ViewerWatchedFilter.All,
            ignored: ViewerIgnoredFilter.Hide,
            dateFrom: null,
            dateTo: null,
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            virtualChannelId: '8',
            sort: ViewerSort.Newest,
            limit: 200,
            offset: 0
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error('Expected successful watch load.');
        }

        expect(result.data.playbackBlockedMessage).toBe('Daily timer limit reached for this virtual channel.');
        expect(result.data.currentVirtualChannelId).toBe('8');
        expect(result.data.nextVideoYoutubeId).toBe('video-4');
    });

    it('blocks watch-page reload when an active session leaves one second remaining', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(8000);

        try {
            const video = createVideo(6);
            const viewerVideoReadRepository = {
                getByYoutubeId: vi.fn(async () => video),
                findAdjacentYoutubeIds: vi.fn(async () => ({
                    previousYoutubeId: null,
                    nextYoutubeId: null
                })),
                list: vi.fn(async () => [])
            };
            const recommendationService = new ViewerRecommendationService(
                { list: viewerVideoReadRepository.list } as never,
                11
            );
            const service = new ViewerWatchService(
                viewerVideoReadRepository as never,
                {} as never,
                {
                    findMostRecentSession: vi.fn(async () => ({
                        id: 91,
                        video_id: video.id,
                        profile_id: 11,
                        session_started_at: 1000,
                        last_updated_at: 5000,
                        time_watched_seconds: 119
                    }))
                } as never,
                createProfileContext(),
                recommendationService,
                {
                    getVirtualChannelById: vi.fn(async () => ({
                        id: '10',
                        name: 'Timers',
                        dailyTimerMax: 120,
                        timerState: ViewerVirtualChannelTimerState.Available,
                        timerUsageSeconds: 119,
                        timerRemainingSeconds: 1,
                        dailyTimerRemainingSeconds: 1,
                        extraTimerSecondsRemaining: 0,
                        combinedTimerRemainingSeconds: 1,
                        timerWindowStartMs: 100,
                        timerWindowEndMs: 200
                    }))
                } as never
            );

            const result = await service.load('video-6', {
                watched: ViewerWatchedFilter.All,
                ignored: ViewerIgnoredFilter.Hide,
                dateFrom: null,
                dateTo: null,
                dateFromInput: '',
                dateToInput: '',
                channelId: null,
                virtualChannelId: '10',
                sort: ViewerSort.Newest,
                limit: 200,
                offset: 0
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error('Expected successful watch load.');
            }

            expect(result.data.playbackBlockedMessage).toBe('Daily timer limit reached for this virtual channel.');
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not block watch-page reload when the recent session is inactive', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(301001);

        try {
            const video = createVideo(7);
            const viewerVideoReadRepository = {
                getByYoutubeId: vi.fn(async () => video),
                findAdjacentYoutubeIds: vi.fn(async () => ({
                    previousYoutubeId: null,
                    nextYoutubeId: null
                })),
                list: vi.fn(async () => [])
            };
            const recommendationService = new ViewerRecommendationService(
                { list: viewerVideoReadRepository.list } as never,
                11
            );
            const service = new ViewerWatchService(
                viewerVideoReadRepository as never,
                {} as never,
                {
                    findMostRecentSession: vi.fn(async () => ({
                        id: 92,
                        video_id: video.id,
                        profile_id: 11,
                        session_started_at: 1000,
                        last_updated_at: 1000,
                        time_watched_seconds: 119
                    }))
                } as never,
                createProfileContext(),
                recommendationService,
                {
                    getVirtualChannelById: vi.fn(async () => ({
                        id: '10',
                        name: 'Timers',
                        dailyTimerMax: 120,
                        timerState: ViewerVirtualChannelTimerState.Available,
                        timerUsageSeconds: 119,
                        timerRemainingSeconds: 1,
                        dailyTimerRemainingSeconds: 1,
                        extraTimerSecondsRemaining: 0,
                        combinedTimerRemainingSeconds: 1,
                        timerWindowStartMs: 100,
                        timerWindowEndMs: 200
                    }))
                } as never
            );

            const result = await service.load('video-7', {
                watched: ViewerWatchedFilter.All,
                ignored: ViewerIgnoredFilter.Hide,
                dateFrom: null,
                dateTo: null,
                dateFromInput: '',
                dateToInput: '',
                channelId: null,
                virtualChannelId: '10',
                sort: ViewerSort.Newest,
                limit: 200,
                offset: 0
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error('Expected successful watch load.');
            }

            expect(result.data.playbackBlockedMessage).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('normalizes string watch-history aggregates before deriving timer state', async () => {
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(async () => new VirtualChannel({
                    id: '2',
                    name: 'Timers',
                    dailyTimerMax: 120,
                    extraTimerSecondsRemaining: 0
                })),
                list: vi.fn(async () => [])
            } as never,
            {
                getVirtualChannelWatchSecondsInWindow: vi.fn(async () => '65'),
                resetVirtualChannelWatchSecondsInWindow: vi.fn(async () => undefined)
            } as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        const virtualChannel = await service.getVirtualChannelById('2');

        expect(virtualChannel).toMatchObject({
            id: '2',
            dailyTimerMax: 120,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 65,
            timerRemainingSeconds: 55,
            dailyTimerRemainingSeconds: 55,
            extraTimerSecondsRemaining: 0,
            combinedTimerRemainingSeconds: 55
        });
    });

    it('exposes daily remaining, extra-time balance, and combined remaining separately', async () => {
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(async () => new VirtualChannel({
                    id: '2',
                    name: 'Timers',
                    dailyTimerMax: 120,
                    extraTimerSecondsRemaining: 30
                })),
                list: vi.fn(async () => [])
            } as never,
            {
                getVirtualChannelWatchSecondsInWindow: vi.fn(async () => '65'),
                resetVirtualChannelWatchSecondsInWindow: vi.fn(async () => undefined)
            } as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        const virtualChannel = await service.getVirtualChannelById('2');

        expect(virtualChannel).toMatchObject({
            id: '2',
            dailyTimerMax: 120,
            timerUsageSeconds: 65,
            timerRemainingSeconds: 55,
            dailyTimerRemainingSeconds: 55,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 85
        });
    });

    it('keeps a channel available after the daily allowance is exhausted when extra time remains', async () => {
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(async () => new VirtualChannel({
                    id: '2',
                    name: 'Timers',
                    dailyTimerMax: 120,
                    extraTimerSecondsRemaining: 30
                })),
                list: vi.fn(async () => [])
            } as never,
            {
                getVirtualChannelWatchSecondsInWindow: vi.fn(async () => '120'),
                resetVirtualChannelWatchSecondsInWindow: vi.fn(async () => undefined)
            } as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        const virtualChannel = await service.getVirtualChannelById('2');

        expect(virtualChannel).toMatchObject({
            id: '2',
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 120,
            dailyTimerRemainingSeconds: 0,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 30
        });
    });

    it('keeps extra time available across a new day window until it is consumed', async () => {
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(async () => new VirtualChannel({
                    id: '2',
                    name: 'Timers',
                    dailyTimerMax: 120,
                    extraTimerSecondsRemaining: 30
                })),
                list: vi.fn(async () => [])
            } as never,
            {
                getVirtualChannelWatchSecondsInWindow: vi.fn(async () => '0'),
                resetVirtualChannelWatchSecondsInWindow: vi.fn(async () => undefined)
            } as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 3, 15, 0, 0)
        );

        const virtualChannel = await service.getVirtualChannelById('2');

        expect(virtualChannel).toMatchObject({
            id: '2',
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 0,
            dailyTimerRemainingSeconds: 120,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 150
        });
    });

    it('decrements persisted extra time only for watch delta spillover beyond daily remaining', async () => {
        const updateExtraTimerSecondsRemaining = vi.fn(async () => undefined);
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(),
                list: vi.fn(),
                updateExtraTimerSecondsRemaining
            } as never,
            {} as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        await service.consumeExtraTimerSecondsForWatchDelta('2', {
            id: '2',
            name: 'Timers',
            dailyTimerMax: 120,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 110,
            timerRemainingSeconds: 10,
            dailyTimerRemainingSeconds: 10,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 40,
            timerWindowStartMs: 100,
            timerWindowEndMs: 200
        }, 15);

        expect(updateExtraTimerSecondsRemaining).toHaveBeenCalledWith('2', 25);
    });

    it('does not decrement extra time when the new watch delta fits inside the daily remaining budget', async () => {
        const updateExtraTimerSecondsRemaining = vi.fn(async () => undefined);
        const service = new ViewerVirtualChannelService(
            {
                get: vi.fn(),
                list: vi.fn(),
                updateExtraTimerSecondsRemaining
            } as never,
            {} as never,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        await service.consumeExtraTimerSecondsForWatchDelta('2', {
            id: '2',
            name: 'Timers',
            dailyTimerMax: 120,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 110,
            timerRemainingSeconds: 10,
            dailyTimerRemainingSeconds: 10,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 40,
            timerWindowStartMs: 100,
            timerWindowEndMs: 200
        }, 10);

        expect(updateExtraTimerSecondsRemaining).not.toHaveBeenCalled();
    });

    it('returns timer-capped enforcement after a progress write and keeps session-expiry failures distinct', async () => {
        const video = createVideo(5);
        const viewerVideoReadRepository = {
            getByYoutubeId: vi.fn(async () => video)
        };
        const historyDAO = {
            findMostRecentSession: vi.fn(async () => ({
                id: 77,
                video_id: video.id,
                profile_id: 11,
                session_started_at: 1000,
                last_updated_at: 5000,
                time_watched_seconds: 25
            })),
            updateSessionProgress: vi.fn(async () => undefined)
        };
        const availableThenCapped = vi.fn()
            .mockResolvedValueOnce({
                id: '9',
                name: 'Timers',
                dailyTimerMax: 60,
                timerState: ViewerVirtualChannelTimerState.Available,
                timerUsageSeconds: 50,
                timerRemainingSeconds: 10,
                dailyTimerRemainingSeconds: 10,
                extraTimerSecondsRemaining: 0,
                combinedTimerRemainingSeconds: 10,
                timerWindowStartMs: 100,
                timerWindowEndMs: 200
            })
            .mockResolvedValueOnce({
                id: '9',
                name: 'Timers',
                dailyTimerMax: 60,
                timerState: ViewerVirtualChannelTimerState.Available,
                timerUsageSeconds: 50,
                timerRemainingSeconds: 10,
                dailyTimerRemainingSeconds: 10,
                extraTimerSecondsRemaining: 0,
                combinedTimerRemainingSeconds: 10,
                timerWindowStartMs: 100,
                timerWindowEndMs: 200
            })
            .mockResolvedValueOnce({
                id: '9',
                name: 'Timers',
                dailyTimerMax: 60,
                timerState: ViewerVirtualChannelTimerState.Capped,
                timerUsageSeconds: 60,
                timerRemainingSeconds: 0,
                dailyTimerRemainingSeconds: 0,
                extraTimerSecondsRemaining: 0,
                combinedTimerRemainingSeconds: 0,
                timerWindowStartMs: 100,
                timerWindowEndMs: 200
            });
        const service = new ViewerWatchService(
            viewerVideoReadRepository as never,
            {} as never,
            historyDAO as never,
            createProfileContext(),
            {} as never,
            {
                getVirtualChannelById: availableThenCapped,
                consumeExtraTimerSecondsForWatchDelta: vi.fn(async () => undefined)
            } as never
        );

        const cappedResult = await service.updateHistoryProgress('video-5', 60, '9', 8000);

        expect(cappedResult).toEqual({
            ok: false,
            status: 409,
            message: 'Virtual channel timer limit reached',
            code: 'timer_capped'
        });
        expect(historyDAO.updateSessionProgress).toHaveBeenCalledWith(77, {
            last_updated_at: 8000,
            time_watched_seconds: 60
        });

        const inactiveHistoryDAO = {
            findMostRecentSession: vi.fn(async () => ({
                id: 88,
                video_id: video.id,
                profile_id: 11,
                session_started_at: 1000,
                last_updated_at: 1000,
                time_watched_seconds: 25
            })),
            updateSessionProgress: vi.fn(async () => undefined)
        };
        const inactiveService = new ViewerWatchService(
            viewerVideoReadRepository as never,
            {} as never,
            inactiveHistoryDAO as never,
            createProfileContext(),
            {} as never,
            {
                getVirtualChannelById: vi.fn(async () => ({
                    id: '9',
                    name: 'Timers',
                    dailyTimerMax: 60,
                    timerState: ViewerVirtualChannelTimerState.Available,
                    timerUsageSeconds: 50,
                    timerRemainingSeconds: 10,
                    dailyTimerRemainingSeconds: 10,
                    extraTimerSecondsRemaining: 0,
                    combinedTimerRemainingSeconds: 10,
                    timerWindowStartMs: 100,
                    timerWindowEndMs: 200
                })),
                consumeExtraTimerSecondsForWatchDelta: vi.fn(async () => undefined)
            } as never
        );

        const inactiveResult = await inactiveService.updateHistoryProgress('video-5', 60, '9', 1000 + (5 * 60 * 1000) + 1);

        expect(inactiveResult).toEqual({
            ok: false,
            status: 409,
            message: 'History session is no longer active',
            code: 'history_session_inactive'
        });
        expect(inactiveHistoryDAO.updateSessionProgress).not.toHaveBeenCalled();
    });

    it('uses only the newly consumed watch delta when applying extra-time spillover during progress updates', async () => {
        const video = createVideo(8);
        const viewerVideoReadRepository = {
            getByYoutubeId: vi.fn(async () => video)
        };
        const historyDAO = {
            findMostRecentSession: vi.fn(async () => ({
                id: 101,
                video_id: video.id,
                profile_id: 11,
                session_started_at: 1000,
                last_updated_at: 5000,
                time_watched_seconds: 25
            })),
            updateSessionProgress: vi.fn(async () => undefined)
        };
        const preWriteVirtualChannel = {
            id: '9',
            name: 'Timers',
            dailyTimerMax: 60,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 50,
            timerRemainingSeconds: 10,
            dailyTimerRemainingSeconds: 10,
            extraTimerSecondsRemaining: 30,
            combinedTimerRemainingSeconds: 40,
            timerWindowStartMs: 100,
            timerWindowEndMs: 200
        };
        const postWriteVirtualChannel = {
            ...preWriteVirtualChannel,
            timerUsageSeconds: 60,
            timerRemainingSeconds: 0,
            dailyTimerRemainingSeconds: 0,
            extraTimerSecondsRemaining: 20,
            combinedTimerRemainingSeconds: 20,
            timerState: ViewerVirtualChannelTimerState.Capped
        };
        const getVirtualChannelById = vi.fn()
            .mockResolvedValueOnce(preWriteVirtualChannel)
            .mockResolvedValueOnce(preWriteVirtualChannel)
            .mockResolvedValueOnce(postWriteVirtualChannel);
        const consumeExtraTimerSecondsForWatchDelta = vi.fn(async () => undefined);
        const service = new ViewerWatchService(
            viewerVideoReadRepository as never,
            {} as never,
            historyDAO as never,
            createProfileContext(),
            {} as never,
            {
                getVirtualChannelById,
                consumeExtraTimerSecondsForWatchDelta
            } as never
        );

        const result = await service.updateHistoryProgress('video-8', 40, '9', 8000);

        expect(result).toEqual({
            ok: false,
            status: 409,
            message: 'Virtual channel timer limit reached',
            code: 'timer_capped'
        });
        expect(consumeExtraTimerSecondsForWatchDelta).toHaveBeenCalledWith(
            '9',
            preWriteVirtualChannel,
            15
        );
        expect(historyDAO.updateSessionProgress).toHaveBeenCalledWith(101, {
            last_updated_at: 8000,
            time_watched_seconds: 40
        });
    });

    it('does not block reload for an active session when daily time is exhausted but extra time remains', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(8000);

        try {
            const video = createVideo(9);
            const viewerVideoReadRepository = {
                getByYoutubeId: vi.fn(async () => video),
                findAdjacentYoutubeIds: vi.fn(async () => ({
                    previousYoutubeId: null,
                    nextYoutubeId: null
                })),
                list: vi.fn(async () => [])
            };
            const recommendationService = new ViewerRecommendationService(
                { list: viewerVideoReadRepository.list } as never,
                11
            );
            const service = new ViewerWatchService(
                viewerVideoReadRepository as never,
                {} as never,
                {
                    findMostRecentSession: vi.fn(async () => ({
                        id: 93,
                        video_id: video.id,
                        profile_id: 11,
                        session_started_at: 1000,
                        last_updated_at: 5000,
                        time_watched_seconds: 120
                    }))
                } as never,
                createProfileContext(),
                recommendationService,
                {
                    getVirtualChannelById: vi.fn(async () => ({
                        id: '11',
                        name: 'Timers',
                        dailyTimerMax: 120,
                        timerState: ViewerVirtualChannelTimerState.Available,
                        timerUsageSeconds: 120,
                        timerRemainingSeconds: 0,
                        dailyTimerRemainingSeconds: 0,
                        extraTimerSecondsRemaining: 30,
                        combinedTimerRemainingSeconds: 30,
                        timerWindowStartMs: 100,
                        timerWindowEndMs: 200
                    }))
                } as never
            );

            const result = await service.load('video-9', {
                watched: ViewerWatchedFilter.All,
                ignored: ViewerIgnoredFilter.Hide,
                dateFrom: null,
                dateTo: null,
                dateFromInput: '',
                dateToInput: '',
                channelId: null,
                virtualChannelId: '11',
                sort: ViewerSort.Newest,
                limit: 200,
                offset: 0
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error('Expected successful watch load.');
            }

            expect(result.data.playbackBlockedMessage).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });
});
// apply-patch-anchor - do not delete
