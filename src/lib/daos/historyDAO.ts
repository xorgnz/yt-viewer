import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { WatchHistory } from '$lib/entities/watchHistory';

export class HistoryDAO extends SqliteDAO
{
    // Accept a plain object for inserts rather than an instance of WatchHistory.
    createSession(entry: {
        video_id: number;
        profile_id: number;
        session_started_at: number;
        last_updated_at: number;
        time_watched_seconds: number;
    }): number
    {
        const info = this.db
            .prepare(`
                INSERT INTO watch_history(
                    video_id,
                    profile_id,
                    session_started_at,
                    last_updated_at,
                    time_watched_seconds
                ) VALUES(?,?,?,?,?)
            `)
            .run(
                entry.video_id,
                entry.profile_id,
                entry.session_started_at,
                entry.last_updated_at,
                entry.time_watched_seconds
            );
        return Number(info.lastInsertRowid);
    }

    add(entry: {
        video_id: number;
        profile_id: number;
        session_started_at: number;
        last_updated_at: number;
        time_watched_seconds: number;
    }): number
    {
        return this.createSession(entry);
    }

    getById(id: number): WatchHistory | null
    {
        const row = this.db
            .prepare(`SELECT * FROM watch_history WHERE id = ?`)
            .get(id) as WatchHistory | undefined;
        return row || null;
    }

    findMostRecentSession(video_id: number, profile_id: number): WatchHistory | null
    {
        const row = this.db
            .prepare(`
                SELECT *
                FROM watch_history
                WHERE video_id = ? AND profile_id = ?
                ORDER BY last_updated_at DESC
                LIMIT 1
            `)
            .get(video_id, profile_id) as WatchHistory | undefined;

        return row || null;
    }

    updateSessionProgress(id: number, patch: {
        last_updated_at: number;
        time_watched_seconds: number;
    }): void
    {
        this.db
            .prepare(`
                UPDATE watch_history
                SET last_updated_at = ?,
                    time_watched_seconds = ?
                WHERE id = ?
            `)
            .run(patch.last_updated_at, patch.time_watched_seconds, id);
    }

    listByProfile(profile_id: number, limit = 100): WatchHistory[]
    {
        return this.db
            .prepare(`SELECT * FROM watch_history WHERE profile_id = ? ORDER BY session_started_at DESC LIMIT ?`)
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
        session_started_at: number;
        last_updated_at: number;
        time_watched_seconds: number;
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
            where.push('h.session_started_at >= :dateFrom');
            params.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo != null) {
            where.push('h.session_started_at <= :dateTo');
            params.dateTo = filters.dateTo;
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const limit = Math.max(0, Math.min(1000, filters.limit ?? 100));
        const offset = Math.max(0, filters.offset ?? 0);
        params.limit = limit;
        params.offset = offset;

        const sql = `
            SELECT
                h.session_started_at,
                h.last_updated_at,
                h.time_watched_seconds,
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
            ORDER BY h.session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all(params) as any[];
    }
}
