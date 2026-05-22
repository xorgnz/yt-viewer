import type { ChannelsListResponse, PlaylistItemsListResponse, VideosListResponse } from './youTubeClient';
import { YouTubeClient } from './youTubeClient';

export interface ChannelWithUploads
{
    channel: ChannelsListResponse['items'][number] | null;
    uploadsPlaylistId: string | null;
    videos: PlaylistItemsListResponse['items'];
}

export class YouTubeChannelDataService
{
    private readonly client: YouTubeClient;

    constructor(client: YouTubeClient)
    {
        this.client = client;
    }

    async fetchChannelMetadata(channelId: string): Promise<ChannelsListResponse['items'][number] | null>
    {
        const response = await this.client.getChannelById(channelId, ['snippet', 'contentDetails']);
        const item = response?.items?.[0] || null;
        return item ?? null;
    }

    async fetchAllPlaylistItems(
        playlistId: string,
        parts: string[] = ['snippet', 'contentDetails']
    ): Promise<PlaylistItemsListResponse['items']>
    {
        const all: PlaylistItemsListResponse['items'] = [];
        let pageToken: string | undefined = undefined;

        do {
            const page = await this.client.listPlaylistItems({
                playlistId,
                pageToken,
                parts,
                maxResults: 50
            });

            if (page?.items?.length) {
                all.push(...page.items);
            }

            pageToken = page.nextPageToken;
        } while (pageToken);

        return all;
    }

    async fetchVideosMetadata(
        videoIds: string[],
        parts: string[] = ['snippet', 'contentDetails']
    ): Promise<VideosListResponse['items']>
    {
        const uniqueIds = Array.from(new Set(videoIds.map((id) => String(id).trim()).filter(Boolean)));
        const all: VideosListResponse['items'] = [];

        for (let index = 0; index < uniqueIds.length; index += 50) {
            const batchIds = uniqueIds.slice(index, index + 50);
            const page = await this.client.listVideos({ ids: batchIds, parts });
            if (page?.items?.length) {
                all.push(...page.items);
            }
        }

        return all;
    }

    async fetchChannelWithUploads(channelId: string): Promise<ChannelWithUploads>
    {
        const channel = await this.fetchChannelMetadata(channelId);
        const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads || null;
        const videos = uploadsPlaylistId
            ? await this.fetchAllPlaylistItems(uploadsPlaylistId)
            : [];

        return {
            channel,
            uploadsPlaylistId,
            videos
        };
    }
}
