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
            `INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at) VALUES(?,?,?,?,?)`,
            [fields.youtube_id, fields.title, fields.description, fields.thumbnail_url, fields.published_at]
        );
    }

    async update(channel: SourceChannel): Promise<void>
    {
        const fields = channel.toFields();

        await this.run(`
            UPDATE source_channels
            SET youtube_id = ?,
                title = ?,
                description = ?,
                thumbnail_url = ?,
                published_at = ?
            WHERE id = ?
        `, [fields.youtube_id, fields.title, fields.description, fields.thumbnail_url, fields.published_at, fields.id]);
    }

    async get(id: number): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE id = ?`,
            [id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async getByExternalId(external_id: string): Promise<SourceChannel | undefined>
    {
        const fields = await this.getOne<SourceChannelFields>(
            `SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels WHERE youtube_id = ?`,
            [external_id]
        );

        return fields ? new SourceChannel(fields) : undefined;
    }

    async list(): Promise<SourceChannel[]>
    {
        const rows = await this.listRows<SourceChannelFields>(
            `SELECT id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at FROM source_channels ORDER BY title`
        );

        return rows.map((row) => new SourceChannel(row));
    }

    async listWithVideoStats(): Promise<SourceChannelWithVideoStats[]>
    {
        const rows = await this.listRows<SourceChannelFields & Omit<SourceChannelWithVideoStats, keyof SourceChannel>>(`
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

