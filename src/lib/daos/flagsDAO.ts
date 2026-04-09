import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { VideoFlags } from '$lib/entities/videoFlags';

export type BulkFlagKind = 'ignored' | 'watched' | 'favorite';

export class FlagsDAO extends SqliteDAO
{
    private ensureRows(videoIds: number[], profileId: number)
    {
        if (videoIds.length === 0) {
            return;
        }

        const insert = this.db.prepare(`
            INSERT INTO video_flags(video_id, profile_id) VALUES(?,?)
            ON CONFLICT(video_id, profile_id) DO NOTHING
        `);
        const transaction = this.db.transaction((ids: number[]) => {
            for (const videoId of ids) {
                insert.run(videoId, profileId);
            }
        });
        transaction(videoIds);
    }

    private getColumn(kind: BulkFlagKind): string
    {
        if (kind === 'ignored' || kind === 'watched' || kind === 'favorite') {
            return kind;
        }

        throw new Error(`Unsupported bulk flag kind: ${kind}`);
    }

    private getValue(row: VideoFlags, kind: BulkFlagKind): 0 | 1
    {
        if (kind === 'ignored') {
            return row.ignored;
        }
        if (kind === 'watched') {
            return row.watched;
        }
        return row.favorite;
    }

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

    listByVideoIds(videoIds: number[], profileId: number): VideoFlags[]
    {
        if (videoIds.length === 0) {
            return [];
        }

        const placeholders = videoIds.map(() => '?').join(',');
        return this.db.prepare(`
            SELECT *
            FROM video_flags
            WHERE profile_id = ?
              AND video_id IN (${placeholders})
        `).all(profileId, ...videoIds) as VideoFlags[];
    }

    getValueMap(videoIds: number[], profileId: number, kind: BulkFlagKind): Map<number, 0 | 1>
    {
        const rows = this.listByVideoIds(videoIds, profileId);
        const valueMap = new Map<number, 0 | 1>();

        for (const row of rows) {
            valueMap.set(row.video_id, this.getValue(row, kind));
        }

        for (const videoId of videoIds) {
            if (!valueMap.has(videoId)) {
                valueMap.set(videoId, 0);
            }
        }

        return valueMap;
    }

    setManyValue(videoIds: number[], profileId: number, kind: BulkFlagKind, value: 0 | 1)
    {
        if (videoIds.length === 0) {
            return;
        }

        const column = this.getColumn(kind);
        this.ensureRows(videoIds, profileId);

        const placeholders = videoIds.map(() => '?').join(',');
        this.db.prepare(`
            UPDATE video_flags
            SET ${column} = ?,
                updated_at = (strftime('%s','now')*1000)
            WHERE profile_id = ?
              AND video_id IN (${placeholders})
        `).run(value, profileId, ...videoIds);
    }

    setManyValues(entries: Array<{ videoId: number; value: 0 | 1 }>, profileId: number, kind: BulkFlagKind)
    {
        if (entries.length === 0) {
            return;
        }

        const uniqueEntries = new Map<number, 0 | 1>();
        for (const entry of entries) {
            uniqueEntries.set(entry.videoId, entry.value);
        }

        const column = this.getColumn(kind);
        const videoIds = Array.from(uniqueEntries.keys());
        this.ensureRows(videoIds, profileId);

        const update = this.db.prepare(`
            UPDATE video_flags
            SET ${column} = ?,
                updated_at = (strftime('%s','now')*1000)
            WHERE video_id = ?
              AND profile_id = ?
        `);
        const transaction = this.db.transaction((items: Array<{ videoId: number; value: 0 | 1 }>) => {
            for (const item of items) {
                update.run(item.value, item.videoId, profileId);
            }
        });

        transaction(Array.from(uniqueEntries.entries()).map(([videoId, value]) => ({ videoId, value })));
    }
}
