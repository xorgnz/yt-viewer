import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { SourceChannel } from '$lib/entities/sourceChannel';

export class SourceChannelDAO extends SqliteDAO
{
    upsert(channel: Omit<SourceChannel, 'id'> | Partial<SourceChannel> & { youtube_id: string; title: string })
    {
        const stmt = this.db.prepare(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES(@youtube_id,@title,@description,@thumbnail_url,@published_at)
            ON CONFLICT(youtube_id) DO UPDATE SET
                title=excluded.title,
                description=excluded.description,
                thumbnail_url=excluded.thumbnail_url,
                published_at=excluded.published_at
        `);
        stmt.run(channel as any);
    }

    get(id: number): SourceChannel | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM source_channels WHERE id = ?`).get(id) as SourceChannel | undefined;
    }

    getByExternalId(external_id: string): SourceChannel | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM source_channels WHERE youtube_id = ?`).get(external_id) as SourceChannel | undefined;
    }

    list(): SourceChannel[]
    {
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at FROM source_channels ORDER BY title`).all() as SourceChannel[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM source_channels WHERE id = ?`).run(id);
    }
}
