import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { PostgresDAO } from '$lib/daos/shared/PostgresDAO';
import type { Video } from '$lib/entities/video';

export class VideoDAO extends SqliteDAO
{
    upsert(video: Omit<Video, 'id'> | Partial<Video> & { youtube_id: string; channel_id: number; title: string })
    {
        const stmt = this.db.prepare(`
            INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES(@youtube_id,@channel_id,@title,@description,@published_at,@duration_seconds,@thumbnail_url,@length_classification)
            ON CONFLICT(youtube_id) DO UPDATE SET
                channel_id=excluded.channel_id,
                title=excluded.title,
                description=excluded.description,
                published_at=excluded.published_at,
                duration_seconds=excluded.duration_seconds,
                thumbnail_url=excluded.thumbnail_url,
                length_classification=excluded.length_classification
        `);
        stmt.run({
            length_classification: 'unknown',
            ...(video as any)
        });
    }

    get(id: number): Video | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE id = ?`).get(id) as Video | undefined;
    }

    listExistingIds(ids: number[]): number[]
    {
        if (ids.length === 0) {
            return [];
        }

        const placeholders = ids.map(() => '?').join(',');
        const rows = this.db.prepare(`
            SELECT id
            FROM videos
            WHERE id IN (${placeholders})
        `).all(...ids) as Array<{ id: number }>;

        return rows.map((row) => row.id);
    }

    getByExternalId(external_id: string): Video | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE youtube_id = ?`).get(external_id) as Video | undefined;
    }

    listByChannel(channel_id: number): Video[]
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE channel_id = ? ORDER BY published_at DESC NULLS LAST, id DESC`).all(channel_id) as Video[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM videos WHERE id = ?`).run(id);
    }
}

export class PostgresVideoDAO extends PostgresDAO
{
    async upsert(video: Omit<Video, 'id'> | Partial<Video> & { youtube_id: string; channel_id: number; title: string }): Promise<void>
    {
        await this.run(`
            INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES(:youtube_id,:channel_id,:title,:description,:published_at,:duration_seconds,:thumbnail_url,:length_classification)
            ON CONFLICT(youtube_id) DO UPDATE SET
                channel_id=excluded.channel_id,
                title=excluded.title,
                description=excluded.description,
                published_at=excluded.published_at,
                duration_seconds=excluded.duration_seconds,
                thumbnail_url=excluded.thumbnail_url,
                length_classification=excluded.length_classification
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
        return this.listRows<Video>(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE channel_id = ? ORDER BY published_at DESC NULLS LAST, id DESC`, [channel_id]);
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM videos WHERE id = ?`, [id]);
    }
}
