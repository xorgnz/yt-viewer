import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
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

export class MySqlHistoryDAO extends MySqlDAO
{
    async createSession(entry: {
        video_id: number;
        profile_id: number;
        session_started_at: number;
        last_updated_at: number;
        time_watched_seconds: number;
    }): Promise<number>
    {
        return this.insert(`
            INSERT INTO watch_history(
                video_id,
                profile_id,
                session_started_at,
                last_updated_at,
                time_watched_seconds
            ) VALUES(?,?,?,?,?)
        `, [
            entry.video_id,
            entry.profile_id,
            entry.session_started_at,
            entry.last_updated_at,
            entry.time_watched_seconds
        ]);
    }

    async add(entry: {
        video_id: number;
        profile_id: number;
        session_started_at: number;
        last_updated_at: number;
        time_watched_seconds: number;
    }): Promise<number>
    {
        return this.createSession(entry);
    }

    async getById(id: number): Promise<WatchHistory | null>
    {
        const row = await this.getOne<WatchHistory>(`SELECT * FROM watch_history WHERE id = ?`, [id]);
        return row || null;
    }

    async findMostRecentSession(video_id: number, profile_id: number): Promise<WatchHistory | null>
    {
        const row = await this.getOne<WatchHistory>(`
            SELECT *
            FROM watch_history
            WHERE video_id = ? AND profile_id = ?
            ORDER BY last_updated_at DESC
            LIMIT 1
        `, [video_id, profile_id]);

        return row || null;
    }

    async updateSessionProgress(id: number, patch: {
        last_updated_at: number;
        time_watched_seconds: number;
    }): Promise<void>
    {
        await this.run(`
            UPDATE watch_history
            SET last_updated_at = ?,
                time_watched_seconds = ?
            WHERE id = ?
        `, [patch.last_updated_at, patch.time_watched_seconds, id]);
    }

    async listByProfile(profile_id: number, limit = 100): Promise<WatchHistory[]>
    {
        return this.listRows<WatchHistory>(
            `SELECT * FROM watch_history WHERE profile_id = ? ORDER BY session_started_at DESC LIMIT ?`,
            [profile_id, limit]
        );
    }
}
// apply-patch-anchor - do not delete



