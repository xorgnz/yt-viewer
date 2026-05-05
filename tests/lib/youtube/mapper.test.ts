import { describe, it, expect } from 'vitest';
import { YouTubeVideoUpsertMapper } from '../../../src/lib/youtube/mapper';

describe('youtube mapper (task 3.3)', () => {
    it('maps playlistItems item to video upsert payload with video metadata classification', () => {
        const mapper = new YouTubeVideoUpsertMapper();
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
        const videoMetadata: any = {
            id: 'vid123',
            snippet: {
                title: 'Video A (canonical)',
                description: 'Canonical desc',
                thumbnails: { high: { url: 'http://v.hi' } }
            },
            contentDetails: {
                duration: 'PT59S'
            }
        };
        const up = mapper.toVideoUpsert(item, 42, videoMetadata);
        expect(up).toMatchObject({
            youtube_id: 'vid123',
            channel_id: 42,
            title: 'Video A (canonical)',
            description: 'Canonical desc',
            thumbnail_url: 'http://v.hi',
            length_classification: 'short'
        });
        expect(typeof up.published_at === 'number' || up.published_at === null).toBe(true);
        expect(up.duration_seconds).toBe(59);
    });

    it('derives long and unknown classifications through the video mapper boundary', () => {
        const mapper = new YouTubeVideoUpsertMapper();

        const longVideo = mapper.toVideoUpsert({
            snippet: {
                title: 'Long video',
                resourceId: { videoId: 'long-video' }
            },
            contentDetails: {
                videoId: 'long-video'
            }
        } as any, 5, {
            id: 'long-video',
            contentDetails: {
                duration: 'PT2H3M4S'
            }
        } as any);

        const unknownVideo = mapper.toVideoUpsert({
            snippet: {
                title: 'Unknown video',
                resourceId: { videoId: 'unknown-video' }
            },
            contentDetails: {
                videoId: 'unknown-video'
            }
        } as any, 5, {
            id: 'unknown-video',
            contentDetails: {
                duration: 'bad'
            }
        } as any);

        expect(longVideo.duration_seconds).toBe(7384);
        expect(longVideo.length_classification).toBe('long');
        expect(unknownVideo.duration_seconds).toBeNull();
        expect(unknownVideo.length_classification).toBe('unknown');
    });

    it('falls back to unknown classification when video metadata is missing', () => {
        const mapper = new YouTubeVideoUpsertMapper();
        const item: any = {
            snippet: {
                title: 'Playlist fallback title',
                description: 'Playlist fallback description',
                publishedAt: '2021-02-03T04:05:06Z',
                resourceId: { videoId: 'vid-missing-metadata' },
                thumbnails: { medium: { url: 'http://v.med' } }
            },
            contentDetails: {
                videoId: 'vid-missing-metadata',
                videoPublishedAt: '2021-02-03T04:05:06Z'
            }
        };

        const up = mapper.toVideoUpsert(item, 7);
        expect(up).toMatchObject({
            youtube_id: 'vid-missing-metadata',
            channel_id: 7,
            title: 'Playlist fallback title',
            description: 'Playlist fallback description',
            thumbnail_url: 'http://v.med',
            duration_seconds: null,
            length_classification: 'unknown'
        });
    });
});
// apply-patch-anchor - do not delete
