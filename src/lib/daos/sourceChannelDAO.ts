import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { SourceChannel } from '$lib/entities/sourceChannel';

export interface SourceChannelWithVideoStats extends SourceChannel
{
    video_count: number;
    watched_count: number;
    favorite_count: number;
    ignored_count: number;
}

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
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE id = ?`).get(id) as SourceChannel | undefined;
    }

    getByExternalId(external_id: string): SourceChannel | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE youtube_id = ?`).get(external_id) as SourceChannel | undefined;
    }

    list(): SourceChannel[]
    {
        return this.db.prepare(`SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels ORDER BY title`).all() as SourceChannel[];
    }

    listWithVideoStats(): SourceChannelWithVideoStats[]
    {
        return this.db.prepare(`
            SELECT
                sc.id,
                sc.youtube_id,
                sc.title,
                sc.description,
                sc.thumbnail_url,
                sc.published_at,
                sc.last_refreshed_at,
                COUNT(v.id) AS video_count,
                COALESCE(SUM(CASE WHEN vf_agg.watched = 1 THEN 1 ELSE 0 END), 0) AS watched_count,
                COALESCE(SUM(CASE WHEN vf_agg.favorite = 1 THEN 1 ELSE 0 END), 0) AS favorite_count,
                COALESCE(SUM(CASE WHEN vf_agg.ignored = 1 THEN 1 ELSE 0 END), 0) AS ignored_count
            FROM source_channels sc
            LEFT JOIN videos v ON v.channel_id = sc.id
            LEFT JOIN (
                SELECT
                    video_id,
                    MAX(watched) AS watched,
                    MAX(favorite) AS favorite,
                    MAX(ignored) AS ignored
                FROM video_flags
                GROUP BY video_id
            ) vf_agg ON vf_agg.video_id = v.id
            GROUP BY sc.id
            ORDER BY sc.title
        `).all() as SourceChannelWithVideoStats[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM source_channels WHERE id = ?`).run(id);
    }

    markRefreshed(id: number, ts: number = Date.now())
    {
        this.db.prepare(`UPDATE source_channels SET last_refreshed_at = ? WHERE id = ?`).run(ts, id);
    }
}
