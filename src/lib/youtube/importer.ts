import type { SourceChannelDAO } from '../daos/sourceChannelDAO';
import type { VideoDAO } from '../daos/videoDAO';
import { YouTubeChannelDataService } from './fetch';
import { YouTubeChannelUpsertMapper, YouTubeVideoUpsertMapper } from './mapper';
import type { YouTubeClient } from './youTubeClient';

export interface ImportResult
{
    channelId: number | null;
    videosUpserted: number;
}

type ImportSourceChannelDAO = Pick<SourceChannelDAO, 'getByExternalId' | 'upsert'>;
type ImportVideoDAO = Pick<VideoDAO, 'upsert'>;

export class YouTubeChannelImportService
{
    private readonly channelDataService: YouTubeChannelDataService;
    private readonly sourceChannelDAO: ImportSourceChannelDAO;
    private readonly videoDAO: ImportVideoDAO;
    private readonly channelMapper: YouTubeChannelUpsertMapper;
    private readonly videoMapper: YouTubeVideoUpsertMapper;

    constructor(
        client: YouTubeClient,
        channelDataService: YouTubeChannelDataService = new YouTubeChannelDataService(client),
        sourceChannelDAO: ImportSourceChannelDAO,
        videoDAO: ImportVideoDAO,
        channelMapper: YouTubeChannelUpsertMapper = new YouTubeChannelUpsertMapper(),
        videoMapper: YouTubeVideoUpsertMapper = new YouTubeVideoUpsertMapper()
    )
    {
        this.channelDataService = channelDataService;
        this.sourceChannelDAO = sourceChannelDAO;
        this.videoDAO = videoDAO;
        this.channelMapper = channelMapper;
        this.videoMapper = videoMapper;
    }

    async importChannel(channelExternalId: string): Promise<ImportResult>
    {
        const { channel, videos } = await this.channelDataService.fetchChannelWithUploads(channelExternalId);
        if (!channel) {
            return { channelId: null, videosUpserted: 0 };
        }

        const videoIds = videos
            .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '')
            .filter(Boolean);
        const videoMetadataItems = await this.channelDataService.fetchVideosMetadata(
            videoIds,
            ['snippet', 'contentDetails']
        );
        const videoMetadataById = new Map(videoMetadataItems.map((item) => [item.id, item]));

        const channelUpsert = this.channelMapper.toChannelUpsert(channel);
        await this.sourceChannelDAO.upsert(channelUpsert);

        const sourceChannel = await this.sourceChannelDAO.getByExternalId(channelUpsert.youtubeId);
        if (!sourceChannel) {
            throw new Error(`Failed to resolve imported channel ${channelUpsert.youtubeId}.`);
        }

        let videosUpserted = 0;
        for (const item of videos) {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
            const videoUpsert = this.videoMapper.toVideoUpsert(
                item,
                sourceChannel.id,
                videoMetadataById.get(videoId)
            );

            if (!videoUpsert.youtube_id) {
                continue;
            }

            await this.videoDAO.upsert(videoUpsert);
            videosUpserted++;
        }

        return {
            channelId: sourceChannel.id,
            videosUpserted
        };
    }
}
// apply-patch-anchor - do not delete
