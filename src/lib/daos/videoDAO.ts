import { getDb } from '$lib/daos/_shared';
import type { Video } from '$lib/entities/video';

export const VideoDAO = {
    upsert(video: Omit<Video, 'id'> | Partial<Video> & { youtube_id: string; channel_id: number; title: string })
    {
        const db = getDb();
        const stmt = db.prepare(`INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url)
      VALUES(@youtube_id,@channel_id,@title,@description,@published_at,@duration_seconds,@thumbnail_url)
      ON CONFLICT(youtube_id) DO UPDATE SET
        channel_id=excluded.channel_id,
        title=excluded.title,
        description=excluded.description,
        published_at=excluded.published_at,
        duration_seconds=excluded.duration_seconds,
        thumbnail_url=excluded.thumbnail_url`);
        stmt.run(video as any);
    },
    get(id: number): Video | undefined
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url FROM videos WHERE id = ?').get(id) as Video | undefined;
    },
    getByExternalId(external_id: string): Video | undefined
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url FROM videos WHERE youtube_id = ?').get(external_id) as Video | undefined;
    },
    listByChannel(channel_id: number): Video[]
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url FROM videos WHERE channel_id = ? ORDER BY published_at DESC NULLS LAST, id DESC').all(channel_id) as Video[];
    },
    remove(id: number)
    {
        const db = getDb();
        db.prepare('DELETE FROM videos WHERE id = ?').run(id);
    }
};
