import type Database from 'better-sqlite3';
import {
    type ResolvedChannelReference,
    YouTubeChannelDataService,
    YouTubeChannelReferenceResolver
} from '$lib/youtube/fetch';
import { type ImportResult, YouTubeChannelImportService } from '$lib/youtube/importer';
import type { ChannelsListResponse, YouTubeClient } from '$lib/youtube/youTubeClient';

export class AdminSourceChannelYouTubeCoordinator
{
    async resolveChannelReference(client: YouTubeClient, input: string): Promise<ResolvedChannelReference>
    {
        return new YouTubeChannelReferenceResolver(client).resolveChannelReference(input);
    }

    async fetchChannelMetadata(
        client: YouTubeClient,
        channelId: string
    ): Promise<ChannelsListResponse['items'][number] | null>
    {
        return new YouTubeChannelDataService(client).fetchChannelMetadata(channelId);
    }

    async importChannelFromYouTube(
        db: Database.Database,
        client: YouTubeClient,
        channelExternalId: string
    ): Promise<ImportResult>
    {
        return new YouTubeChannelImportService(db, client).importChannel(channelExternalId);
    }
}
