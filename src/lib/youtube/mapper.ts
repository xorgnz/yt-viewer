import type { ChannelsListResponse, PlaylistItemsListResponse, VideosListResponse } from './youTubeClient';

// Helpers to pick best thumbnail URL from a thumbnails object
function bestThumb(thumbnails?: Record<string, { url: string }>): string | null
{
    if (!thumbnails) return null;
    return (
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        (thumbnails as any).default?.url ||
        null
    );
}

/** Map a YouTube channel API item into a channel upsert payload. */
export function mapChannelItemToUpsert(item: ChannelsListResponse['items'][number])
{
    const snippet = item.snippet || {};
    const publishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;
    return {
        youtube_id: item.id,
        title: snippet.title || '',
        description: snippet.description || '',
        thumbnail_url: bestThumb(snippet.thumbnails),
        published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null
    } as const;
}

/** Map a playlistItems API item into a video upsert payload. */
export function mapPlaylistItemToVideoUpsert(
    item: PlaylistItemsListResponse['items'][number],
    channel_id: number,
    videoMetadata?: VideosListResponse['items'][number]
)
{
    const snippet = item.snippet || {};
    const details = item.contentDetails || {};
    const metadataSnippet = videoMetadata?.snippet || {};
    const metadataDetails = videoMetadata?.contentDetails || {};
    const vid = details.videoId || snippet.resourceId?.videoId || '';
    const publishedAt = (details.videoPublishedAt || snippet.publishedAt) ? Date.parse(details.videoPublishedAt || snippet.publishedAt!) : null;
    const durationSeconds = parseIso8601DurationSeconds(metadataDetails.duration);
    const lengthClassification = classifyVideoLength(durationSeconds);

    return {
        youtube_id: vid,
        channel_id,
        title: metadataSnippet.title || snippet.title || '',
        description: metadataSnippet.description || snippet.description || '',
        published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null,
        duration_seconds: durationSeconds,
        thumbnail_url: bestThumb(metadataSnippet.thumbnails as any) || bestThumb(snippet.thumbnails as any),
        length_classification: lengthClassification
    } as const;
}

export function parseIso8601DurationSeconds(value?: string): number | null
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

export function classifyVideoLength(durationSeconds?: number | null): 'long' | 'short' | 'unknown'
{
    if (durationSeconds == null || durationSeconds <= 0) {
        return 'unknown';
    }

    return durationSeconds <= 60 ? 'short' : 'long';
}
