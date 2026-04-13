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

}
