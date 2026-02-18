import Database from 'better-sqlite3';
import { ChannelDAO } from '../daos/channelDAO';
import { VideoDAO } from '../daos/videoDAO';
import type { YouTubeClient } from './client';
import { fetchChannelWithUploads } from './fetch';
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

        const chDao = new ChannelDAO(db);
        const vDao = new VideoDAO(db);

        // Run inside a transaction for consistency
        const trx = db.transaction(() => {
            // Upsert channel and obtain internal id
            const chUpsert = mapChannelItemToUpsert(channel);
            chDao.upsert(chUpsert as any);
            const ch = chDao.getByExternalId(chUpsert.youtube_id)!;

            let count = 0;
            for (const item of videos) {
                const up = mapPlaylistItemToVideoUpsert(item, ch.id);
                if (!up.youtube_id) continue; // skip malformed entries
                vDao.upsert(up as any);
                count++;
            }
            return { channelId: ch.id, videosUpserted: count } as ImportResult;
        });

        return trx();
    })();
}
