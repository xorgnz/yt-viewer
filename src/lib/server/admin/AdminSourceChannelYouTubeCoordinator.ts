import type Database from 'better-sqlite3';
import { fetchChannelMetadata, type ResolvedChannelReference, resolveChannelReference } from '$lib/youtube/fetch';
import { importChannelFromYouTube, type ImportResult } from '$lib/youtube/importer';
import type { ChannelsListResponse, YouTubeClient } from '$lib/youtube/youTubeClient';

export class AdminSourceChannelYouTubeCoordinator
{
    async resolveChannelReference(client: YouTubeClient, input: string): Promise<ResolvedChannelReference>
    {
        return resolveChannelReference(client, input);
    }

    async fetchChannelMetadata(
        client: YouTubeClient,
        channelId: string
    ): Promise<ChannelsListResponse['items'][number] | null>
    {
        return fetchChannelMetadata(client, channelId);
    }

    async importChannelFromYouTube(
        db: Database.Database,
        client: YouTubeClient,
        channelExternalId: string
    ): Promise<ImportResult>
    {
        return importChannelFromYouTube(db, client, channelExternalId);
    }
}
