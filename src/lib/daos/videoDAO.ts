import { DAO } from '$lib/daos/shared/DAO';
import { Video, type VideoFields } from '$lib/entities/video';

export class VideoDAO extends DAO
{
    async create(video: Video): Promise<void>
    {
        const fields = video.toFields();

        await this.run(
            `INSERT INTO videos(video_id, src_channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification) VALUES(?,?,?,?,?,?,?,?)`,
            [
                String(fields.id),
                String(fields.channel_id),
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
            SET video_id = ?,
                src_channel_id = ?,
                title = ?,
                description = ?,
                published_at = ?,
                duration_seconds = ?,
                thumbnail_url = ?,
                length_classification = ?
            WHERE video_id = ?
        `, [
            String(fields.id),
            String(fields.channel_id),
            fields.title,
            fields.description,
            fields.published_at,
            fields.duration_seconds,
            fields.thumbnail_url,
            fields.length_classification,
            String(fields.id)
        ]);
    }

    async get(id: string | number): Promise<Video | undefined>
    {
        const fields = await this.getOne<VideoFields>(`
            SELECT video_id AS id, video_id AS youtube_id, src_channel_id AS channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE video_id = ?`,
            [id]
        );

        return fields ? new Video(fields) : undefined;
    }

    async listExistingIds(ids: Array<string | number>): Promise<string[]>
    {
        if (ids.length === 0) {
            return [];
        }

        const placeholders = ids.map(() => '?').join(',');
        const rows = await this.listRows<{ video_id: string }>(`
            SELECT video_id
            FROM videos
            WHERE video_id IN (${placeholders})
        `, ids.map((id) => String(id)));

        return rows.map((row) => row.video_id);
    }

    async getByExternalId(external_id: string): Promise<Video | undefined>
    {
        const fields = await this.getOne<VideoFields>(`
            SELECT video_id AS id, video_id AS youtube_id, src_channel_id AS channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE video_id = ?`,
            [external_id]
        );

        return fields ? new Video(fields) : undefined;
    }

    async listByChannel(channel_id: string | number): Promise<Video[]>
    {
        const rows = await this.listRows<VideoFields>(`
            SELECT video_id AS id, video_id AS youtube_id, src_channel_id AS channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos 
            WHERE src_channel_id = ? 
            ORDER BY published_at IS NULL ASC, published_at DESC, video_id DESC`,
            [channel_id]
        );

        return rows.map((row) => new Video(row));
    }

    async remove(id: string | number): Promise<void>
    {
        await this.run(`DELETE FROM videos WHERE video_id = ?`, [String(id)]);
    }
}
// apply-patch-anchor - do not delete



