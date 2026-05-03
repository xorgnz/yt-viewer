import { describe, expect, it, vi } from 'vitest';
import type { ViewerVideoRecord } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';
import { ViewerRecommendationService } from '../../src/lib/server/viewer/ViewerRecommendationService';
import { ViewerVirtualChannelService } from '../../src/lib/server/viewer/ViewerVirtualChannelService';
import { ViewerWatchService } from '../../src/lib/server/viewer/ViewerWatchService';

function createVideo(id: number): ViewerVideoRecord
{
    return {
        id,
        youtube_id: `video-${id}`,
        channel_id: 7,
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
            new VirtualChannel({ id: 1, name: 'Unlimited', dailyTimerMax: null }),
            new VirtualChannel({ id: 2, name: 'Capped', dailyTimerMax: 1 })
        ]));
        const historyDAO = {
            getVirtualChannelWatchSecondsInWindow: vi.fn(async (_profileId: number, virtualChannelId: number) => {
                return virtualChannelId === 2 ? 60 : 0;
            })
        };
        const service = new ViewerVirtualChannelService(
            { get: vi.fn(), list },
            historyDAO,
            createProfileContext(),
            () => Date.UTC(2026, 4, 2, 15, 0, 0)
        );

        const groups = await service.loadVirtualChannels();

        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({
            id: 1,
            timerState: 'unlimited',
            timerUsageSeconds: 0,
            timerRemainingSeconds: null
        });
        expect(groups[1]).toMatchObject({
            id: 2,
            timerState: 'capped',
            timerUsageSeconds: 60,
            timerRemainingSeconds: 0
        });
        expect(historyDAO.getVirtualChannelWatchSecondsInWindow).toHaveBeenCalledTimes(1);
        expect(historyDAO.getVirtualChannelWatchSecondsInWindow).toHaveBeenCalledWith(
            11,
            2,
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
            { list: viewerVideoReadRepository.list },
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
                    id: 8,
                    name: 'Timers',
                    dailyTimerMax: 1,
                    timerState: 'capped' as const,
                    timerUsageSeconds: 60,
                    timerRemainingSeconds: 0,
                    timerWindowStartMs: 100,
                    timerWindowEndMs: 200
                }))
            }
        );

        const result = await service.load('video-3', {
            watched: 'all',
            ignored: 'hide',
            dateFrom: null,
            dateTo: null,
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: 8,
            sort: 'newest',
            limit: 200,
            offset: 0
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error('Expected successful watch load.');
        }

        expect(result.data.playbackBlockedMessage).toBe('Daily timer limit reached for this virtual channel.');
        expect(result.data.currentGroupId).toBe(8);
        expect(result.data.nextVideoYoutubeId).toBe('video-4');
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
                id: 9,
                name: 'Timers',
                dailyTimerMax: 1,
                timerState: 'available' as const,
                timerUsageSeconds: 50,
                timerRemainingSeconds: 10,
                timerWindowStartMs: 100,
                timerWindowEndMs: 200
            })
            .mockResolvedValueOnce({
                id: 9,
                name: 'Timers',
                dailyTimerMax: 1,
                timerState: 'capped' as const,
                timerUsageSeconds: 60,
                timerRemainingSeconds: 0,
                timerWindowStartMs: 100,
                timerWindowEndMs: 200
            });
        const service = new ViewerWatchService(
            viewerVideoReadRepository as never,
            {} as never,
            historyDAO as never,
            createProfileContext(),
            {} as never,
            { getVirtualChannelById: availableThenCapped }
        );

        const cappedResult = await service.updateHistoryProgress('video-5', 60, 9, 8000);

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
                    id: 9,
                    name: 'Timers',
                    dailyTimerMax: 1,
                    timerState: 'available' as const,
                    timerUsageSeconds: 50,
                    timerRemainingSeconds: 10,
                    timerWindowStartMs: 100,
                    timerWindowEndMs: 200
                }))
            }
        );

        const inactiveResult = await inactiveService.updateHistoryProgress('video-5', 60, 9, 1000 + (5 * 60 * 1000) + 1);

        expect(inactiveResult).toEqual({
            ok: false,
            status: 409,
            message: 'History session is no longer active',
            code: 'history_session_inactive'
        });
        expect(inactiveHistoryDAO.updateSessionProgress).not.toHaveBeenCalled();
    });
});
// apply-patch-anchor - do not delete
