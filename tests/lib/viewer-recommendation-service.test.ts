import { describe, expect, it, vi } from 'vitest';
import { ViewerRecommendationService } from '../../src/lib/server/viewer/ViewerRecommendationService';
import type { ViewerVideoRecord } from '../../src/lib/daos/readers/ViewerVideoReadRepository';

function createVideo(id: number): ViewerVideoRecord
{
    return {
        id: `video-${id}`,
        youtube_id: `video-${id}`,
        channel_id: 'channel-7',
        title: `Video ${id}`,
        description: '',
        published_at: id * 1000,
        duration_seconds: 60,
        thumbnail_url: null,
        length_classification: 'short',
        channel_title: 'Channel',
        channel_youtube_id: 'channel-7',
        watched: 0,
        favorite: 0,
        ignored: 0
    };
}

describe('ViewerRecommendationService', () => {
    it('selects deterministic recommendations from the active pool', async () => {
        const videos = Array.from({ length: 12 }, (_, index) => createVideo(index + 1));
        const list = vi.fn(async () => videos);
        const service = new ViewerRecommendationService({ list }, 'default');

        const first = await service.load(videos[0], 'vc_queue');
        const second = await service.load(videos[0], 'vc_queue');

        expect(list).toHaveBeenCalledWith({
            watched: 'all',
            ignored: 'hide',
            channelId: null,
            virtualChannelId: 'vc_queue',
            limit: 1000,
            offset: 0
        }, 'default');
        expect(first).toHaveLength(8);
        expect(first.map((video) => video.id)).toEqual(second.map((video) => video.id));
        expect(first.some((video) => video.id === videos[0].id)).toBe(false);
    });

    it('falls back to the current source channel when no virtual channel is active', async () => {
        const videos = Array.from({ length: 4 }, (_, index) => createVideo(index + 1));
        const list = vi.fn(async () => videos);
        const service = new ViewerRecommendationService({ list }, 'child');

        await service.load(videos[0], null, 2);

        expect(list).toHaveBeenCalledWith({
            watched: 'all',
            ignored: 'hide',
            channelId: 'channel-7',
            virtualChannelId: null,
            limit: 1000,
            offset: 0
        }, 'child');
    });
});
// apply-patch-anchor - do not delete
