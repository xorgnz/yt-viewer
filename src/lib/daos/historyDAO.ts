import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { WatchHistory } from '$lib/entities/watchHistory';

export class HistoryDAO extends SqliteDAO
{
    add(entry: Omit<WatchHistory, 'id'>): number
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
}
