import { MySqlSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { MySqlVideoDAO } from '$lib/daos/videoDAO';
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
        db: unknown,
        client: YouTubeClient,
        channelExternalId: string
    ): Promise<ImportResult>
    {
        const mysqlDb = db as MySqlPoolWrapper;

        return new YouTubeChannelImportService(
            client,
            new YouTubeChannelDataService(client),
            new MySqlSourceChannelDAO(mysqlDb),
            new MySqlVideoDAO(mysqlDb)
        ).importChannel(channelExternalId);
    }
}
// apply-patch-anchor - do not delete
