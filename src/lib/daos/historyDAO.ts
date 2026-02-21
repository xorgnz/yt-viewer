import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { WatchHistory } from '$lib/entities/watchHistory';

export class HistoryDAO extends SqliteDAO
{
    // Accept a plain object for inserts rather than an instance of WatchHistory
    add(entry: { video_id: number; profile_id: number; watched_at: number }): number
    {
        const info = this.db
            .prepare(`INSERT INTO watch_history(video_id, profile_id, watched_at) VALUES(?,?,?)`)
            .run(entry.video_id, entry.profile_id, entry.watched_at);
        return Number(info.lastInsertRowid);
    }

    listByProfile(profile_id: number, limit = 100): WatchHistory[]
    {
        return this.db
            .prepare(`SELECT * FROM watch_history WHERE profile_id = ? ORDER BY watched_at DESC LIMIT ?`)
            .all(profile_id, limit) as WatchHistory[];
    }

    /**
     * Returns watch history rows joined with basic video and channel details,
     * ordered by newest first, with optional filters.
     */
    listWithFilters(filters: {
        profileId?: number | null;
        channelId?: number | null;
        dateFrom?: number | null; // inclusive, ms epoch
        dateTo?: number | null;   // inclusive, ms epoch
        limit?: number;
        offset?: number;
    }): Array<{
        watched_at: number;
        profile_id: number;
        video_id: number;
        youtube_id: string;
        title: string;
        channel_id: number;
        channel_title: string;
    }>
    {
        const where: string[] = [];
        const params: Record<string, any> = {};

        if (filters.profileId != null) {
            where.push('h.profile_id = :profileId');
            params.profileId = filters.profileId;
        }
        if (filters.channelId != null) {
            where.push('v.channel_id = :channelId');
            params.channelId = filters.channelId;
        }
        if (filters.dateFrom != null) {
            where.push('h.watched_at >= :dateFrom');
            params.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo != null) {
            where.push('h.watched_at <= :dateTo');
            params.dateTo = filters.dateTo;
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const limit = Math.max(0, Math.min(1000, filters.limit ?? 100));
        const offset = Math.max(0, filters.offset ?? 0);
        params.limit = limit;
        params.offset = offset;

        const sql = `
            SELECT
                h.watched_at,
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            ORDER BY h.watched_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all(params) as any[];
    }
}
