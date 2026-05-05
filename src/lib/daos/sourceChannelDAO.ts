import { DAO } from '$lib/daos/shared/DAO';
import type { SourceChannel } from '$lib/entities/sourceChannel';

export interface SourceChannelWithVideoStats extends SourceChannel
{
    video_count: number;
    watched_count: number;
    favorite_count: number;
    ignored_count: number;
}

export class SourceChannelDAO extends DAO
{
    async upsert(channel: Omit<SourceChannel, 'id'> | Partial<SourceChannel> & { youtubeId: string; title: string }): Promise<void>
    {
        await this.run(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES(:youtube_id,:title,:description,:thumbnail_url,:published_at)
            ON DUPLICATE KEY UPDATE
                title=VALUES(title),
                description=VALUES(description),
                thumbnail_url=VALUES(thumbnail_url),
                published_at=VALUES(published_at)
        `, {
            youtube_id: channel.youtubeId,
            title: channel.title,
            description: channel.description,
            thumbnail_url: channel.thumbnailUrl,
            published_at: channel.publishedAt
        });
    }

    async get(id: number): Promise<SourceChannel | undefined>
    {
        return this.getOne<SourceChannel>(`
            SELECT
                id,
                youtube_id AS youtubeId,
                title,
                description,
                thumbnail_url AS thumbnailUrl,
                published_at AS publishedAt,
                last_refreshed_at AS lastRefreshedAt
            FROM source_channels
            WHERE id = ?
        `, [id]);
    }

    async getByExternalId(external_id: string): Promise<SourceChannel | undefined>
    {
        return this.getOne<SourceChannel>(`
            SELECT
                id,
                youtube_id AS youtubeId,
                title,
                description,
                thumbnail_url AS thumbnailUrl,
                published_at AS publishedAt,
                last_refreshed_at AS lastRefreshedAt
            FROM source_channels
            WHERE youtube_id = ?
        `, [external_id]);
    }

    async list(): Promise<SourceChannel[]>
    {
        return this.listRows<SourceChannel>(`
            SELECT
                id,
                youtube_id AS youtubeId,
                title,
                description,
                thumbnail_url AS thumbnailUrl,
                published_at AS publishedAt,
                last_refreshed_at AS lastRefreshedAt
            FROM source_channels
            ORDER BY title
        `);
    }

    async listWithVideoStats(): Promise<SourceChannelWithVideoStats[]>
    {
        return this.listRows<SourceChannelWithVideoStats>(`
            SELECT
                sc.id,
                sc.youtube_id AS youtubeId,
                sc.title,
                sc.description,
                sc.thumbnail_url AS thumbnailUrl,
                sc.published_at AS publishedAt,
                sc.last_refreshed_at AS lastRefreshedAt,
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
        `);
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM source_channels WHERE id = ?`, [id]);
    }

    async markRefreshed(id: number, ts: number = Date.now()): Promise<void>
    {
        await this.run(`UPDATE source_channels SET last_refreshed_at = ? WHERE id = ?`, [ts, id]);
    }
}
// apply-patch-anchor - do not delete



