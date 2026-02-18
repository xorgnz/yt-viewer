import type { ChannelsListResponse, PlaylistItemsListResponse } from './youTubeClient';

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
    channel_id: number
)
{
    const snippet = item.snippet || {};
    const details = item.contentDetails || {};
    const vid = details.videoId || snippet.resourceId?.videoId || '';
    const publishedAt = (details.videoPublishedAt || snippet.publishedAt) ? Date.parse(details.videoPublishedAt || snippet.publishedAt!) : null;
    return {
        youtube_id: vid,
        channel_id,
        title: snippet.title || '',
        description: snippet.description || '',
        published_at: Number.isFinite(publishedAt as any) ? (publishedAt as number) : null,
        duration_seconds: null as number | null, // Not available from playlistItems; could be populated via Videos API later
        thumbnail_url: bestThumb(snippet.thumbnails as any)
    } as const;
}
