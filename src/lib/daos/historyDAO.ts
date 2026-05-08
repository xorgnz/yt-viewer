import { DAO } from '$lib/daos/shared/DAO';
import type { WatchHistory } from '$lib/entities/watchHistory';

export class HistoryDAO extends DAO
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

    async getVirtualChannelWatchSecondsInWindow(
        profileId: number,
        virtualChannelId: number,
        windowStartMs: number,
        windowEndMs: number
    ): Promise<number>
    {
        const row = await this.getOne<{ totalWatchSeconds: number }>(`
            SELECT COALESCE(SUM(h.time_watched_seconds), 0) AS totalWatchSeconds
            FROM watch_history h
            INNER JOIN videos v
                ON v.id = h.video_id
            INNER JOIN virtual_channel_assignments a
                ON a.source_channel_id = v.channel_id
            WHERE h.profile_id = ?
              AND a.virtual_channel_id = ?
              AND h.last_updated_at >= ?
              AND h.last_updated_at < ?
        `, [
            profileId,
            virtualChannelId,
            windowStartMs,
            windowEndMs
        ]);

        return row?.totalWatchSeconds ?? 0;
    }

    async resetVirtualChannelWatchSecondsInWindow(
        profileId: number,
        virtualChannelId: number,
        windowStartMs: number,
        windowEndMs: number
    ): Promise<void>
    {
        await this.run(`
            DELETE FROM watch_history
            WHERE profile_id = ?
              AND video_id IN (
                  SELECT v.id
                  FROM videos v
                  INNER JOIN virtual_channel_assignments a
                      ON a.source_channel_id = v.channel_id
                  WHERE a.virtual_channel_id = ?
              )
              AND last_updated_at >= ?
              AND last_updated_at < ?
        `, [
            profileId,
            virtualChannelId,
            windowStartMs,
            windowEndMs
        ]);
    }
}
// apply-patch-anchor - do not delete



