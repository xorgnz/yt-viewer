import { DAO } from '$lib/daos/shared/DAO';
import type { Video } from '$lib/entities/video';

export class VideoDAO extends DAO
{
    async upsert(video: Omit<Video, 'id'> | Partial<Video> & { youtube_id: string; channel_id: number; title: string }): Promise<void>
    {
        await this.run(`
            INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES(:youtube_id,:channel_id,:title,:description,:published_at,:duration_seconds,:thumbnail_url,:length_classification)
            ON DUPLICATE KEY UPDATE
                channel_id=VALUES(channel_id),
                title=VALUES(title),
                description=VALUES(description),
                published_at=VALUES(published_at),
                duration_seconds=VALUES(duration_seconds),
                thumbnail_url=VALUES(thumbnail_url),
                length_classification=VALUES(length_classification)
        `, {
            length_classification: 'unknown',
            ...(video as Record<string, unknown>)
        });
    }

    async get(id: number): Promise<Video | undefined>
    {
        return this.getOne<Video>(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE id = ?`, [id]);
    }

    async listExistingIds(ids: number[]): Promise<number[]>
    {
        if (ids.length === 0) {
            return [];
        }

        const placeholders = ids.map(() => '?').join(',');
        const rows = await this.listRows<{ id: number }>(`
            SELECT id
            FROM videos
            WHERE id IN (${placeholders})
        `, ids);

        return rows.map((row) => row.id);
    }

    async getByExternalId(external_id: string): Promise<Video | undefined>
    {
        return this.getOne<Video>(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE youtube_id = ?`, [external_id]);
    }

    async listByChannel(channel_id: number): Promise<Video[]>
    {
        return this.listRows<Video>(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE channel_id = ? ORDER BY published_at IS NULL ASC, published_at DESC, id DESC`, [channel_id]);
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM videos WHERE id = ?`, [id]);
    }
}
// apply-patch-anchor - do not delete



