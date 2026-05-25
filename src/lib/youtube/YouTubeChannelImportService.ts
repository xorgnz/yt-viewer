import type { SourceChannelDAO } from '../daos/sourceChannelDAO';
import type { VideoDAO } from '../daos/videoDAO';
import { SourceChannel } from '../entities/sourceChannel';
import { YouTubeChannelService } from './YouTubeChannelService';
import { YouTubeVideoUpsertMapper } from './YouTubeVideoUpsertMapper';

export interface ImportResult
{
    channelId: string | number | null;
    videosUpserted: number;
}

export class YouTubeChannelImportService
{
    private readonly youTubeChannelService: YouTubeChannelService;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly videoDAO: VideoDAO;

    constructor(
        youTubeChannelService: YouTubeChannelService,
        sourceChannelDAO: SourceChannelDAO,
        videoDAO: VideoDAO
    )
    {
        this.youTubeChannelService = youTubeChannelService;
        this.sourceChannelDAO = sourceChannelDAO;
        this.videoDAO = videoDAO;
    }

    async importChannel(channelExternalId: string): Promise<ImportResult>
    {
        const { channel, videos } = await this.youTubeChannelService.fetchChannelWithUploads(channelExternalId);
        if (!channel) {
            return { channelId: null, videosUpserted: 0 };
        }

        const videoIds = videos
            .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '')
            .filter(Boolean);
        const videoMetadataItems = await this.youTubeChannelService.fetchVideosMetadata(
            videoIds,
            ['snippet', 'contentDetails']
        );
        const videoMetadataById = new Map(videoMetadataItems.map((item) => [item.id, item]));
        const snippet = channel.snippet || {};
        const publishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;
        const channelData = {
            id: channel.id,
            youtubeId: channel.id,
            title: snippet.title || '',
            description: snippet.description || '',
            thumbnailUrl: this.getBestThumbnailUrl(snippet.thumbnails as Record<string, { url?: string }> | undefined),
            publishedAt: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null
        };
        const existingSourceChannel = await this.sourceChannelDAO.getByExternalId(channelData.youtubeId);
        if (existingSourceChannel) {
            await this.sourceChannelDAO.update(existingSourceChannel.with(new SourceChannel({ ...channelData, lastRefreshedAt: null })));
        } else {
            await this.sourceChannelDAO.create(new SourceChannel({ ...channelData, lastRefreshedAt: null }));
        }

        const sourceChannel = await this.sourceChannelDAO.getByExternalId(channelData.youtubeId);
        if (!sourceChannel) {
            throw new Error(`Failed to resolve imported channel ${channelData.youtubeId}.`);
        }

        let videosUpserted = 0;
        for (const item of videos) {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
            const video = YouTubeVideoUpsertMapper.toVideo(
                item,
                sourceChannel.id,
                videoMetadataById.get(videoId)
            );

            if (!video.youtube_id) {
                continue;
            }

            const existingVideo = await this.videoDAO.getByExternalId(video.youtube_id);
            if (existingVideo) {
                await this.videoDAO.update(existingVideo.with(video));
            } else {
                await this.videoDAO.create(video);
            }
            videosUpserted++;
        }

        return {
            channelId: sourceChannel.id,
            videosUpserted
        };
    }

    private getBestThumbnailUrl(thumbnails?: Record<string, { url?: string }>): string | null
    {
        if (!thumbnails) {
            return null;
        }

        const prioritizedKeys = ['maxres', 'standard', 'high', 'medium', 'default'];
        for (const key of prioritizedKeys) {
            const url = thumbnails[key]?.url;
            if (url) {
                return url;
            }
        }

        for (const entry of Object.values(thumbnails)) {
            if (entry?.url) {
                return entry.url;
            }
        }

        return null;
    }
}
// apply-patch-anchor - do not delete
