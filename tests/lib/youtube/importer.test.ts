import { describe, expect, it, vi } from 'vitest';
import { SourceChannel } from '../../../src/lib/entities/sourceChannel';
import { VideoLengthClassification } from '../../../src/lib/entities/video';
import { YouTubeChannelImportService } from '../../../src/lib/youtube/importer';

describe('YouTubeChannelImportService', () => {
    it('upserts source channels and videos using stable youtube-derived ids', async () => {
        const sourceChannelDAO = {
            getByExternalId: vi
                .fn()
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(new SourceChannel({
                    id: 'UC123',
                    youtube_id: 'UC123',
                    title: 'Demo Channel',
                    description: '',
                    thumbnail_url: null,
                    published_at: null,
                    last_refreshed_at: null
                })),
            create: vi.fn(async () => undefined),
            update: vi.fn(async () => undefined)
        };
        const videoDAO = {
            getByExternalId: vi.fn(async () => undefined),
            create: vi.fn(async () => undefined),
            update: vi.fn(async () => undefined)
        };
        const channelDataService = {
            fetchChannelWithUploads: vi.fn(async () => ({
                channel: {
                    id: 'UC123',
                    snippet: {
                        title: 'Demo Channel',
                        description: 'Imported',
                        publishedAt: '2021-02-03T04:05:06Z',
                        thumbnails: {}
                    }
                },
                videos: [
                    {
                        snippet: {
                            title: 'Video 1',
                            resourceId: { videoId: 'vid-1' }
                        },
                        contentDetails: {
                            videoId: 'vid-1'
                        }
                    }
                ]
            })),
            fetchVideosMetadata: vi.fn(async () => [{
                id: 'vid-1',
                snippet: {
                    title: 'Video 1',
                    description: 'Imported video',
                    thumbnails: {}
                },
                contentDetails: {
                    duration: 'PT30S'
                }
            }])
        };
        const service = new YouTubeChannelImportService(
            {} as never,
            channelDataService as never,
            sourceChannelDAO as never,
            videoDAO as never
        );

        const result = await service.importChannel('UC123');

        expect(sourceChannelDAO.create).toHaveBeenCalledWith(expect.objectContaining({
            id: 'UC123',
            youtubeId: 'UC123'
        }));
        expect(videoDAO.create).toHaveBeenCalledWith(expect.objectContaining({
            id: 'vid-1',
            youtube_id: 'vid-1',
            channel_id: 'UC123',
            length_classification: VideoLengthClassification.Short
        }));
        expect(result).toEqual({
            channelId: 'UC123',
            videosUpserted: 1
        });
    });
});
