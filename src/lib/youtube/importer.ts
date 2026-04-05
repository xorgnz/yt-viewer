import Database from 'better-sqlite3';
import { SourceChannelDAO } from '../daos/sourceChannelDAO';
import { VideoDAO } from '../daos/videoDAO';
import type { YouTubeClient } from './youTubeClient';
import { fetchChannelWithUploads, fetchVideosMetadata } from './fetch';
import { mapChannelItemToUpsert, mapPlaylistItemToVideoUpsert } from './mapper';

export interface ImportResult
{
    channelId: number | null; // internal channel id (if channel existed/created)
    videosUpserted: number;
}

/**
 * Import a channel by YouTube channel ID:
 * - Fetch channel metadata + uploads playlist items
 * - Upsert channel
 * - Map and upsert videos
 */
export function importChannelFromYouTube(db: Database.Database, yt: YouTubeClient, channelExternalId: string): Promise<ImportResult>
{
    return (async () => {
        const { channel, videos } = await fetchChannelWithUploads(yt, channelExternalId);
        if (!channel) {
            return { channelId: null, videosUpserted: 0 };
        }

        const videoIds = videos
            .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '')
            .filter(Boolean);
        const videoMetadataItems = await fetchVideosMetadata(yt, videoIds, ['snippet', 'contentDetails']);
        const videoMetadataById = new Map(videoMetadataItems.map((item) => [item.id, item]));

        const chDao = new SourceChannelDAO(db);
        const vDao = new VideoDAO(db);

        // Run inside a transaction for consistency
        const trx = db.transaction(() => {
            // Upsert channel and obtain internal id
            const chUpsert = mapChannelItemToUpsert(channel);
            chDao.upsert(chUpsert as any);
            const ch = chDao.getByExternalId(chUpsert.youtube_id)!;

            let count = 0;
            for (const item of videos) {
                const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
                const up = mapPlaylistItemToVideoUpsert(item, ch.id, videoMetadataById.get(videoId));
                if (!up.youtube_id) continue; // skip malformed entries
                vDao.upsert(up as any);
                count++;
            }
            return { channelId: ch.id, videosUpserted: count } as ImportResult;
        });

        return trx();
    })();
}
