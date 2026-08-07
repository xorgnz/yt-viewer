import { DAO } from '$lib/daos/shared/DAO';
import { SourceChannel, type SourceChannelFields } from '$lib/entities/sourceChannel';
import { SourceChannelWithVideoStats } from '$lib/entities/SourceChannelWithVideoStats';

interface SourceChannelWithVideoStatsRow extends SourceChannelFields
{
    videoCount: number;
    virtualChannelCount: number;
    watchedCount: number;
    favoriteCount: number;
    ignoredCount: number;
}

export class SourceChannelDAO extends DAO
{
    async create(channel: SourceChannel): Promise<void>
    {
        const fields = channel.serialize();

        await this.run(
            `INSERT INTO source_channels(src_channel_id, title, description, thumbnail_url, published_at) VALUES(?,?,?,?,?)`,
            [String(fields.id), fields.title, fields.description, fields.thumbnailUrl, fields.publishedAt]
        );
    }

    async update(channel: SourceChannel): Promise<void>
    {
        const fields = channel.serialize();

        await this.run(`
            UPDATE source_channels
            SET src_channel_id = ?,
                title = ?,
                description = ?,
                thumbnail_url = ?,
                published_at = ?
            WHERE src_channel_id = ?
        `, [String(fields.id), fields.title, fields.description, fields.thumbnailUrl, fields.publishedAt, String(fields.id)]);
    }

    async get(id: string | number): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT src_channel_id AS id, title, description, thumbnail_url as thumbnailUrl, published_at as publishedAt, last_refreshed_at as lastRefreshedAt FROM source_channels WHERE src_channel_id = ?`,
            [id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async getByExternalId(external_id: string): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT src_channel_id AS id, title, description, thumbnail_url as thumbnailUrl, published_at as publishedAt, last_refreshed_at as lastRefreshedAt FROM source_channels WHERE src_channel_id = ?`,
            [external_id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async list(): Promise<SourceChannel[]>
    {
        const rows = await this.listRows<SourceChannelFields>(
            `SELECT src_channel_id AS id, title, description, thumbnail_url as thumbnailUrl, published_at as publishedAt, last_refreshed_at as lastRefreshedAt  FROM source_channels ORDER BY title`
        );

        return rows.map((row) => new SourceChannel(row));
    }

    async listWithVideoStats(): Promise<SourceChannelWithVideoStats[]>
    {
        const rows = await this.listRows<SourceChannelWithVideoStatsRow>(`
            SELECT
                sc.src_channel_id AS id,
                sc.title,
                sc.description,
                sc.thumbnail_url AS thumbnailUrl,
                sc.published_at AS publishedAt,
                sc.last_refreshed_at AS lastRefreshedAt,
                COUNT(v.video_id) AS videoCount,
                COALESCE(vca_agg.virtualChannelCount, 0) AS virtualChannelCount,
                COALESCE(SUM(CASE WHEN vf_agg.watched = 1 THEN 1 ELSE 0 END), 0) AS watchedCount,
                COALESCE(SUM(CASE WHEN vf_agg.favorite = 1 THEN 1 ELSE 0 END), 0) AS favoriteCount,
                COALESCE(SUM(CASE WHEN vf_agg.ignored = 1 THEN 1 ELSE 0 END), 0) AS ignoredCount
            FROM source_channels sc
            LEFT JOIN videos v ON v.src_channel_id = sc.src_channel_id
            LEFT JOIN (
                SELECT
                    video_id,
                    MAX(watched) AS watched,
                    MAX(favorite) AS favorite,
                    MAX(ignored) AS ignored
                FROM video_flags
                GROUP BY video_id
            ) vf_agg ON vf_agg.video_id = v.video_id
            LEFT JOIN (
                SELECT
                    src_channel_id,
                    COUNT(DISTINCT vchannel_id) AS virtualChannelCount
                FROM virtual_channel_assignments
                GROUP BY src_channel_id
            ) vca_agg ON vca_agg.src_channel_id = sc.src_channel_id
            GROUP BY
                sc.src_channel_id,
                sc.title,
                sc.description,
                sc.thumbnail_url,
                sc.published_at,
                sc.last_refreshed_at,
                vca_agg.virtualChannelCount
            ORDER BY sc.title
        `);

        return rows.map((row) => new SourceChannelWithVideoStats({
            sourceChannel: new SourceChannel(row),
            videoCount: row.videoCount,
            virtualChannelCount: row.virtualChannelCount,
            watchedCount: row.watchedCount,
            favoriteCount: row.favoriteCount,
            ignoredCount: row.ignoredCount
        }));
    }

    async remove(id: string | number): Promise<void>
    {
        await this.run(`DELETE FROM source_channels WHERE src_channel_id = ?`, [String(id)]);
    }

    async markRefreshed(id: string | number, ts: number = Date.now()): Promise<void>
    {
        await this.run(`UPDATE source_channels SET last_refreshed_at = ? WHERE src_channel_id = ?`, [ts, String(id)]);
    }
}
// apply-patch-anchor - do not delete
