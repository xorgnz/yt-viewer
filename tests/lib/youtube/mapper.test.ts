import { describe, it, expect } from 'vitest';
import { mapChannelItemToUpsert, mapPlaylistItemToVideoUpsert } from '../../../src/lib/youtube/mapper';

describe('youtube mapper (task 3.3)', () => {
    it('maps channel item to channel upsert payload', () => {
        const item: any = {
            id: 'UC_123',
            snippet: {
                title: 'SourceChannel Title',
                description: 'About this channel',
                publishedAt: '2020-01-02T03:04:05Z',
                thumbnails: {
                    default: { url: 'http://t.def' },
                    medium: { url: 'http://t.med' },
                    high: { url: 'http://t.hi' }
                }
            }
        };
        const up = mapChannelItemToUpsert(item);
        expect(up).toMatchObject({
            youtube_id: 'UC_123',
            title: 'SourceChannel Title',
            description: 'About this channel',
            thumbnail_url: 'http://t.hi'
        });
        expect(typeof up.published_at === 'number' || up.published_at === null).toBe(true);
    });

    it('maps playlistItems item to video upsert payload', () => {
        const item: any = {
            snippet: {
                title: 'Video A',
                description: 'Desc',
                publishedAt: '2021-02-03T04:05:06Z',
                resourceId: { videoId: 'vid123' },
                thumbnails: { medium: { url: 'http://v.med' } }
            },
            contentDetails: {
                videoId: 'vid123',
                videoPublishedAt: '2021-02-03T04:05:06Z'
            }
        };
        const up = mapPlaylistItemToVideoUpsert(item, 42);
        expect(up).toMatchObject({
            youtube_id: 'vid123',
            channel_id: 42,
            title: 'Video A',
            description: 'Desc',
            thumbnail_url: 'http://v.med',
            length_classification: 'unknown'
        });
        expect(typeof up.published_at === 'number' || up.published_at === null).toBe(true);
        expect(up.duration_seconds).toBeNull();
    });
});
