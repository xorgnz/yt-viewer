import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { VideoFlags } from '$lib/entities/videoFlags';

export class FlagsDAO extends SqliteDAO
{
    set(video_id: number, profile_id: number, patch: Partial<Pick<VideoFlags, 'ignored' | 'watched' | 'favorite'>>)
    {
        // Upsert base row
        this.db.prepare(`
            INSERT INTO video_flags(video_id, profile_id) VALUES(?,?)
            ON CONFLICT(video_id, profile_id) DO NOTHING
        `).run(video_id, profile_id);

        const sets: string[] = [];
        const params: unknown[] = [];
        if (patch.ignored !== undefined) { sets.push("ignored = ?"); params.push(patch.ignored); }
        if (patch.watched !== undefined) { sets.push("watched = ?"); params.push(patch.watched); }
        if (patch.favorite !== undefined) { sets.push("favorite = ?"); params.push(patch.favorite); }
        if (sets.length === 0) return;
        const sql = `UPDATE video_flags SET ${sets.join(", ")}, updated_at = (strftime('%s','now')*1000) WHERE video_id = ? AND profile_id = ?`;
        params.push(video_id, profile_id);
        this.db.prepare(sql).run(...params);
    }

    get(video_id: number, profile_id: number): VideoFlags | undefined
    {
        return this.db.prepare(`SELECT * FROM video_flags WHERE video_id = ? AND profile_id = ?`).get(video_id, profile_id) as VideoFlags | undefined;
    }
}
