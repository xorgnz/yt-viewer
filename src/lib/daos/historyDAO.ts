import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import {
    HistorySessionReadQuerySpec,
    HistoryVideoSummaryReadQuerySpec,
    type HistoryReadFilters
} from '$lib/daos/queries/HistoryReadQuerySpec';
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
     * Returns one row per watch session, ordered by newest session first.
     */
    listSessionsWithFilters(filters: HistoryReadFilters): Array<{
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
        const querySpec = new HistorySessionReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

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

        return this.db.prepare(sql).all({
            ...params,
            limit,
            offset
        }) as any[];
    }

    listWithFilters(filters: HistoryReadFilters): Array<{
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
        return this.listSessionsWithFilters(filters);
    }

    /**
     * Returns one row per video with aggregate session data, ordered by latest
     * session start time first, with optional filters.
     */
    listVideoSummariesWithFilters(filters: HistoryReadFilters): Array<{
        profile_id: number;
        video_id: number;
        youtube_id: string;
        title: string;
        channel_id: number;
        channel_title: string;
        total_time_watched_seconds: number;
        session_count: number;
        latest_session_started_at: number;
        latest_last_updated_at: number;
    }>
    {
        const querySpec = new HistoryVideoSummaryReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title,
                SUM(h.time_watched_seconds) AS total_time_watched_seconds,
                COUNT(*) AS session_count,
                MAX(h.session_started_at) AS latest_session_started_at,
                MAX(h.last_updated_at) AS latest_last_updated_at
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            GROUP BY
                h.profile_id,
                v.id,
                v.youtube_id,
                v.title,
                c.id,
                c.title
            ORDER BY latest_session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all({
            ...params,
            limit,
            offset
        }) as any[];
    }
}
