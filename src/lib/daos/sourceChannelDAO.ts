import { DAO } from '$lib/daos/shared/DAO';
import { SourceChannel, type SourceChannelFields } from '$lib/entities/sourceChannel';

export interface SourceChannelWithVideoStats extends SourceChannel
{
    video_count: number;
    watched_count: number;
    favorite_count: number;
    ignored_count: number;
}

export class SourceChannelDAO extends DAO
{
    async create(channel: SourceChannel): Promise<void>
    {
        const fields = channel.toFields();

        await this.run(
            `INSERT INTO source_channels(src_channel_id, title, description, thumbnail_url, published_at) VALUES(?,?,?,?,?)`,
            [String(fields.id), fields.title, fields.description, fields.thumbnail_url, fields.published_at]
        );
    }

    async update(channel: SourceChannel): Promise<void>
    {
        const fields = channel.toFields();

        await this.run(`
            UPDATE source_channels
            SET src_channel_id = ?,
                title = ?,
                description = ?,
                thumbnail_url = ?,
                published_at = ?
            WHERE src_channel_id = ?
        `, [String(fields.id), fields.title, fields.description, fields.thumbnail_url, fields.published_at, String(fields.id)]);
    }

    async get(id: string | number): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT src_channel_id AS id, src_channel_id AS youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE src_channel_id = ?`,
            [id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async getByExternalId(external_id: string): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT src_channel_id AS id, src_channel_id AS youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE src_channel_id = ?`,
            [external_id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async list(): Promise<SourceChannel[]>
    {
        const rows = await this.listRows<SourceChannelFields>(
            `SELECT src_channel_id AS id, src_channel_id AS youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels ORDER BY title`
        );

        return rows.map((row) => new SourceChannel(row));
    }

    async listWithVideoStats(): Promise<SourceChannelWithVideoStats[]>
    {
        const rows = await this.listRows<SourceChannelFields & Omit<SourceChannelWithVideoStats, keyof SourceChannel>>(`
            SELECT
                sc.id,
                sc.src_channel_id AS youtube_id,
                sc.src_channel_id AS id,
                sc.title,
                sc.description,
                sc.thumbnail_url,
                sc.published_at,
                sc.last_refreshed_at,
                COUNT(v.video_id) AS video_count,
                COALESCE(SUM(CASE WHEN vf_agg.watched = 1 THEN 1 ELSE 0 END), 0) AS watched_count,
                COALESCE(SUM(CASE WHEN vf_agg.favorite = 1 THEN 1 ELSE 0 END), 0) AS favorite_count,
                COALESCE(SUM(CASE WHEN vf_agg.ignored = 1 THEN 1 ELSE 0 END), 0) AS ignored_count
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
            GROUP BY
                sc.src_channel_id,
                sc.title,
                sc.description,
                sc.thumbnail_url,
                sc.published_at,
                sc.last_refreshed_at
            ORDER BY sc.title
        `);

        return rows.map((row) => Object.assign(
            new SourceChannel(row),
            {
                video_count: row.video_count,
                watched_count: row.watched_count,
                favorite_count: row.favorite_count,
                ignored_count: row.ignored_count
            }
        ));
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
