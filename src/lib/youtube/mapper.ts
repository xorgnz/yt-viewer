import type { ChannelsListResponse, PlaylistItemsListResponse, VideosListResponse } from './youTubeClient';

export class YouTubeChannelUpsertMapper
{
    toChannelUpsert(item: ChannelsListResponse['items'][number])
    {
        const snippet = item.snippet || {};
        const publishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

        return {
            youtube_id: item.id,
            title: snippet.title || '',
            description: snippet.description || '',
            thumbnail_url: this.getBestThumbnailUrl(snippet.thumbnails),
            published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null
        } as const;
    }

    private getBestThumbnailUrl(thumbnails?: Record<string, { url: string }>): string | null
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

export class YouTubeVideoUpsertMapper
{
    toVideoUpsert(
        item: PlaylistItemsListResponse['items'][number],
        channelId: number,
        videoMetadata?: VideosListResponse['items'][number]
    )
    {
        const snippet = item.snippet || {};
        const details = item.contentDetails || {};
        const metadataSnippet = videoMetadata?.snippet || {};
        const metadataDetails = videoMetadata?.contentDetails || {};
        const videoId = details.videoId || snippet.resourceId?.videoId || '';
        const publishedAtValue = details.videoPublishedAt || snippet.publishedAt;
        const publishedAt = publishedAtValue ? Date.parse(publishedAtValue) : null;
        const durationSeconds = this.parseDurationSeconds(metadataDetails.duration);

        return {
            youtube_id: videoId,
            channel_id: channelId,
            title: metadataSnippet.title || snippet.title || '',
            description: metadataSnippet.description || snippet.description || '',
            published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null,
            duration_seconds: durationSeconds,
            thumbnail_url: this.getBestThumbnailUrl(metadataSnippet.thumbnails as any) ||
                this.getBestThumbnailUrl(snippet.thumbnails as any),
            length_classification: this.classifyLength(durationSeconds)
        } as const;
    }

    private parseDurationSeconds(value?: string): number | null
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

    private classifyLength(durationSeconds?: number | null): 'long' | 'short' | 'unknown'
    {
        if (durationSeconds == null || durationSeconds <= 0) {
            return 'unknown';
        }

        return durationSeconds <= 60 ? 'short' : 'long';
    }

    private getBestThumbnailUrl(thumbnails?: Record<string, { url: string }>): string | null
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
