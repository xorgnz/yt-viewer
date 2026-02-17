import { getDb } from '$lib/daos/_shared';
import type { Channel } from '$lib/entities/channel';

export const ChannelDAO = {
    upsert(channel: Omit<Channel, 'id'> | Partial<Channel> & { youtube_id: string; title: string })
    {
        const db = getDb();
        const stmt = db.prepare(`INSERT INTO channels(youtube_id, title, description, thumbnail_url, published_at)
      VALUES(@youtube_id,@title,@description,@thumbnail_url,@published_at)
      ON CONFLICT(youtube_id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        thumbnail_url=excluded.thumbnail_url,
        published_at=excluded.published_at`);
        stmt.run(channel as any);
    },
    get(id: number): Channel | undefined
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM channels WHERE id = ?').get(id) as Channel | undefined;
    },
    getByExternalId(external_id: string): Channel | undefined
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM channels WHERE youtube_id = ?').get(external_id) as Channel | undefined;
    },
    list(): Channel[]
    {
        const db = getDb();
        return db.prepare('SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM channels ORDER BY title').all() as Channel[];
    },
    remove(id: number)
    {
        const db = getDb();
        db.prepare('DELETE FROM channels WHERE id = ?').run(id);
    }
};
