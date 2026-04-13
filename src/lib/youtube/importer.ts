import type Database from 'better-sqlite3';
import { SourceChannelDAO } from '../daos/sourceChannelDAO';
import { VideoDAO } from '../daos/videoDAO';
import { YouTubeChannelDataService } from './fetch';
import { YouTubeChannelUpsertMapper, YouTubeVideoUpsertMapper } from './mapper';
import type { YouTubeClient } from './youTubeClient';

export interface ImportResult
{
    channelId: number | null;
    videosUpserted: number;
}

export class YouTubeChannelImportService
{
    private readonly db: Database.Database;
    private readonly channelDataService: YouTubeChannelDataService;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly videoDAO: VideoDAO;
    private readonly channelMapper: YouTubeChannelUpsertMapper;
    private readonly videoMapper: YouTubeVideoUpsertMapper;

    constructor(
        db: Database.Database,
        client: YouTubeClient,
        channelDataService: YouTubeChannelDataService = new YouTubeChannelDataService(client),
        sourceChannelDAO: SourceChannelDAO = new SourceChannelDAO(db),
        videoDAO: VideoDAO = new VideoDAO(db),
        channelMapper: YouTubeChannelUpsertMapper = new YouTubeChannelUpsertMapper(),
        videoMapper: YouTubeVideoUpsertMapper = new YouTubeVideoUpsertMapper()
    )
    {
        this.db = db;
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

        // Run inside a transaction for consistency.
        const transaction = this.db.transaction(() => {
            const channelUpsert = this.channelMapper.toChannelUpsert(channel);
            this.sourceChannelDAO.upsert(channelUpsert);

            const sourceChannel = this.sourceChannelDAO.getByExternalId(channelUpsert.youtube_id);
            if (!sourceChannel) {
                throw new Error(`Failed to resolve imported channel ${channelUpsert.youtube_id}.`);
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

                this.videoDAO.upsert(videoUpsert);
                videosUpserted++;
            }

            return {
                channelId: sourceChannel.id,
                videosUpserted
            };
        });

        return transaction();
    }
}
