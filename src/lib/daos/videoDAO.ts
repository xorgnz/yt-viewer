import { DAO } from '$lib/daos/shared/DAO';
import { Video, type VideoFields } from '$lib/entities/video';

export class VideoDAO extends DAO
{
    async create(video: Video): Promise<void>
    {
        const fields = video.toFields();

        await this.run(
            `INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification) VALUES(?,?,?,?,?,?,?,?)`,
            [
                fields.youtube_id,
                fields.channel_id,
                fields.title,
                fields.description,
                fields.published_at,
                fields.duration_seconds,
                fields.thumbnail_url,
                fields.length_classification
            ]
        );
    }

    async update(video: Video): Promise<void>
    {
        const fields = video.toFields();

        await this.run(`
            UPDATE videos
            SET youtube_id = ?,
                channel_id = ?,
                title = ?,
                description = ?,
                published_at = ?,
                duration_seconds = ?,
                thumbnail_url = ?,
                length_classification = ?
            WHERE id = ?
        `, [
            fields.youtube_id,
            fields.channel_id,
            fields.title,
            fields.description,
            fields.published_at,
            fields.duration_seconds,
            fields.thumbnail_url,
            fields.length_classification,
            fields.id
        ]);
    }

    async get(id: number): Promise<Video | undefined>
    {
        const fields = await this.getOne<VideoFields>(`
            SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE id = ?`,
            [id]
        );

        return fields ? new Video(fields) : undefined;
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
        const fields = await this.getOne<VideoFields>(`
            SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE youtube_id = ?`,
            [external_id]
        );

        return fields ? new Video(fields) : undefined;
    }

    async listByChannel(channel_id: number): Promise<Video[]>
    {
        const rows = await this.listRows<VideoFields>(`
            SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE channel_id = ? 
            ORDER BY published_at IS NULL ASC, published_at DESC, id DESC`,
            [channel_id]
        );

        return rows.map((row) => new Video(row));
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM videos WHERE id = ?`, [id]);
    }
}
// apply-patch-anchor - do not delete



