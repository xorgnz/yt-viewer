import { Video, VideoLengthClassification } from '$lib/entities/video';
import type { PlaylistItemsListResponse, VideosListResponse } from './youTubeClient';

export class YouTubeVideoUpsertMapper
{
    static toVideo(
        item: PlaylistItemsListResponse['items'][number],
        channelId: string | number,
        videoMetadata?: VideosListResponse['items'][number]
    ): Video
    {
        const snippet = item.snippet || {};
        const details = item.contentDetails || {};
        const metadataSnippet = videoMetadata?.snippet || {};
        const metadataDetails = videoMetadata?.contentDetails || {};
        const videoId = details.videoId || snippet.resourceId?.videoId || '';
        const publishedAtValue = details.videoPublishedAt || snippet.publishedAt;
        const publishedAt = publishedAtValue ? Date.parse(publishedAtValue) : null;
        const durationSeconds = YouTubeVideoUpsertMapper.parseDurationSeconds(metadataDetails.duration);

        return new Video({
            id: videoId,
            youtube_id: videoId,
            channel_id: channelId,
            title: metadataSnippet.title || snippet.title || '',
            description: metadataSnippet.description || snippet.description || '',
            published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null,
            duration_seconds: durationSeconds,
            thumbnail_url: YouTubeVideoUpsertMapper.getBestThumbnailUrl(metadataSnippet.thumbnails as any) ||
                YouTubeVideoUpsertMapper.getBestThumbnailUrl(snippet.thumbnails as any),
            length_classification: YouTubeVideoUpsertMapper.classifyLength(durationSeconds)
        });
    }

    private static parseDurationSeconds(value?: string): number | null
    {
        if (!value) {
            return null;
        }

        const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
        if (!match) {
            return null;
        }

        const days = Number(match[1] || 0);
        const hours = Number(match[2] || 0);
        const minutes = Number(match[3] || 0);
        const seconds = Number(match[4] || 0);

        return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
    }

    private static classifyLength(durationSeconds?: number | null): VideoLengthClassification
    {
        if (durationSeconds == null || durationSeconds <= 0) {
            return VideoLengthClassification.Unknown;
        }

        return durationSeconds <= 60 ? VideoLengthClassification.Short : VideoLengthClassification.Long;
    }

    private static getBestThumbnailUrl(thumbnails?: Record<string, { url: string }>): string | null
    {
        if (!thumbnails) {
            return null;
        }

        const prioritizedKeys = ['maxres', 'standard', 'high', 'medium', 'default'];
        for (const key of prioritizedKeys) {
            const url = (thumbnails as any)[key]?.url;
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
