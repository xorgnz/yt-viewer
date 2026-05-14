import { DAO } from '$lib/daos/shared/DAO';
import type { VideoFlags } from '$lib/entities/videoFlags';

export type BulkFlagKind = 'ignored' | 'watched' | 'favorite';

export class FlagsDAO extends DAO
{
    private async ensureRows(videoIds: Array<string | number>, profileId: string | number): Promise<void>
    {
        for (const videoId of videoIds) {
            await this.run(`
                INSERT IGNORE INTO video_flags(video_id, profile_id) VALUES(?,?)
            `, [String(videoId), String(profileId)]);
        }
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

    async set(
        video_id: string | number,
        profile_id: string | number,
        patch: Partial<Pick<VideoFlags, 'ignored' | 'watched' | 'favorite'>>
    ): Promise<void>
    {
        await this.run(`
            INSERT IGNORE INTO video_flags(video_id, profile_id) VALUES(?,?)
        `, [String(video_id), String(profile_id)]);

        const sets: string[] = [];
        const params: unknown[] = [];

        if (patch.ignored !== undefined) { sets.push('ignored = ?'); params.push(patch.ignored); }
        if (patch.watched !== undefined) { sets.push('watched = ?'); params.push(patch.watched); }
        if (patch.favorite !== undefined) { sets.push('favorite = ?'); params.push(patch.favorite); }
        if (sets.length === 0) { return; }

        params.push(String(video_id), String(profile_id));

        await this.run(
            `UPDATE video_flags SET ${sets.join(', ')}, updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000) WHERE video_id = ? AND profile_id = ?`,
            params
        );
    }

    async get(video_id: string | number, profile_id: string | number): Promise<VideoFlags | undefined>
    {
        return this.getOne<VideoFlags>(`SELECT * FROM video_flags WHERE video_id = ? AND profile_id = ?`, [String(video_id), String(profile_id)]);
    }

    async listByVideoIds(videoIds: Array<string | number>, profileId: string | number): Promise<VideoFlags[]>
    {
        if (videoIds.length === 0) {
            return [];
        }

        const placeholders = videoIds.map(() => '?').join(',');
        return this.listRows<VideoFlags>(`
            SELECT *
            FROM video_flags
            WHERE profile_id = ?
              AND video_id IN (${placeholders})
        `, [String(profileId), ...videoIds.map((videoId) => String(videoId))]);
    }

    async getValueMap(videoIds: Array<string | number>, profileId: string | number, kind: BulkFlagKind): Promise<Map<string, 0 | 1>>
    {
        const rows = await this.listByVideoIds(videoIds, profileId);
        const valueMap = new Map<string, 0 | 1>();

        for (const row of rows) {
            valueMap.set(String(row.video_id), this.getValue(row, kind));
        }

        for (const videoId of videoIds) {
            const normalizedVideoId = String(videoId);

            if (!valueMap.has(normalizedVideoId)) {
                valueMap.set(normalizedVideoId, 0);
            }
        }

        return valueMap;
    }

    async setManyValue(videoIds: Array<string | number>, profileId: string | number, kind: BulkFlagKind, value: 0 | 1): Promise<void>
    {
        if (videoIds.length === 0) {
            return;
        }

        const column = this.getColumn(kind);
        await this.ensureRows(videoIds, profileId);

        const placeholders = videoIds.map(() => '?').join(',');
        await this.run(`
            UPDATE video_flags
            SET ${column} = ?,
                updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
            WHERE profile_id = ?
              AND video_id IN (${placeholders})
        `, [value, String(profileId), ...videoIds.map((videoId) => String(videoId))]);
    }

    async setManyValues(
        entries: Array<{ videoId: string | number; value: 0 | 1 }>,
        profileId: string | number,
        kind: BulkFlagKind
    ): Promise<void>
    {
        if (entries.length === 0) {
            return;
        }

        const uniqueEntries = new Map<string, 0 | 1>();
        for (const entry of entries) {
            uniqueEntries.set(String(entry.videoId), entry.value);
        }

        const column = this.getColumn(kind);
        const videoIds = Array.from(uniqueEntries.keys());
        await this.ensureRows(videoIds, profileId);

        for (const [videoId, value] of uniqueEntries) {
            await this.run(`
                UPDATE video_flags
                SET ${column} = ?,
                    updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
                WHERE video_id = ?
                  AND profile_id = ?
            `, [value, videoId, String(profileId)]);
        }
    }

    async setMany(
        entries: Array<{ videoId: string | number; watched: 0 | 1; favorite: 0 | 1; ignored: 0 | 1 }>,
        profileId: string | number
    ): Promise<void>
    {
        if (entries.length === 0) {
            return;
        }

        const uniqueEntries = new Map<string, { watched: 0 | 1; favorite: 0 | 1; ignored: 0 | 1 }>();
        for (const entry of entries) {
            uniqueEntries.set(String(entry.videoId), {
                watched: entry.watched,
                favorite: entry.favorite,
                ignored: entry.ignored
            });
        }

        const videoIds = Array.from(uniqueEntries.keys());
        await this.ensureRows(videoIds, profileId);

        for (const [videoId, value] of uniqueEntries) {
            await this.run(`
                UPDATE video_flags
                SET watched = ?,
                    favorite = ?,
                    ignored = ?,
                    updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
                WHERE video_id = ?
                  AND profile_id = ?
            `, [value.watched, value.favorite, value.ignored, videoId, String(profileId)]);
        }
    }
}
// apply-patch-anchor - do not delete



