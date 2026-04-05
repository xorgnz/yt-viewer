import { describe, it, expect } from 'vitest';
import {
    classifyVideoLength,
    mapChannelItemToUpsert,
    mapPlaylistItemToVideoUpsert,
    parseIso8601DurationSeconds
} from '../../../src/lib/youtube/mapper';

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

    it('maps playlistItems item to video upsert payload with video metadata classification', () => {
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
        const up = mapPlaylistItemToVideoUpsert(item, 42, videoMetadata);
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

    it('parses ISO-8601 durations and classifies length', () => {
        expect(parseIso8601DurationSeconds('PT59S')).toBe(59);
        expect(parseIso8601DurationSeconds('PT1M1S')).toBe(61);
        expect(parseIso8601DurationSeconds('PT2H3M4S')).toBe(7384);
        expect(parseIso8601DurationSeconds('bad')).toBeNull();

        expect(classifyVideoLength(59)).toBe('short');
        expect(classifyVideoLength(61)).toBe('long');
        expect(classifyVideoLength(null)).toBe('unknown');
    });
});
