import { YouTubeClient } from './youTubeClient';
import type { ChannelsListResponse, PlaylistItemsListResponse } from './youTubeClient';

export interface ChannelWithUploads
{
    channel: ChannelsListResponse['items'][number] | null;
    uploadsPlaylistId: string | null;
    videos: PlaylistItemsListResponse['items'];
}

/**
 * Fetch a single channel object by channel ID. Returns null if not found.
 */
export async function fetchChannelMetadata(yt: YouTubeClient, channelId: string): Promise<ChannelsListResponse['items'][number] | null>
{
    const res = await yt.getChannelById(channelId, ['snippet', 'contentDetails']);
    const item = res?.items?.[0] || null;
    return item ?? null;
}

/**
 * Fetch all items from a playlist, following page tokens until exhaustion.
 */
export async function fetchAllPlaylistItems(
    yt: YouTubeClient,
    playlistId: string,
    parts: string[] = ['snippet', 'contentDetails']
): Promise<PlaylistItemsListResponse['items']>
{
    const all: PlaylistItemsListResponse['items'] = [];
    let pageToken: string | undefined = undefined;
    do {
        const page = await yt.listPlaylistItems({ playlistId, pageToken, parts, maxResults: 50 });
        if (page?.items?.length) all.push(...page.items);
        pageToken = page.nextPageToken;
    } while (pageToken);
    return all;
}

/**
 * Convenience: fetch channel metadata and all upload videos (via uploads playlist).
 */
export async function fetchChannelWithUploads(yt: YouTubeClient, channelId: string): Promise<ChannelWithUploads>
{
    const channel = await fetchChannelMetadata(yt, channelId);
    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads || null;
    const videos: PlaylistItemsListResponse['items'] = uploadsPlaylistId
        ? await fetchAllPlaylistItems(yt, uploadsPlaylistId)
        : [];
    return { channel, uploadsPlaylistId, videos };
}
