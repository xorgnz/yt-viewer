import { DAO } from '$lib/daos/shared/DAO';
import {
    ViewerVideoQuerySpec,
    type ViewerVideoQueryFilters
} from '$lib/daos/queries/ViewerVideoQuerySpec';

export interface ViewerVideoRecord
{
    id: number;
    youtube_id: string;
    channel_id: number;
    title: string;
    description: string;
    published_at: number | null;
    duration_seconds: number | null;
    thumbnail_url: string | null;
    length_classification: 'long' | 'short' | 'unknown' | null;
    channel_title: string;
    channel_youtube_id: string;
    watched: number;
    favorite: number;
    ignored: number;
}

export class ViewerVideoReadRepository extends DAO
{
    async findAdjacentYoutubeIds(
        video: Pick<ViewerVideoRecord, 'youtube_id'>,
        filters: ViewerVideoQueryFilters,
        profileId: number
    ): Promise<{ previousYoutubeId: string | null; nextYoutubeId: string | null }>
    {
        const querySpec = new ViewerVideoQuerySpec(filters, profileId);
        const { whereSql, groupJoin, selectionJoin, params } = querySpec.buildCountQueryParts();
        const orderBySql = querySpec.getOrderBySql();

        const sql = `
            SELECT
                ordered.previous_youtube_id AS previous_youtube_id,
                ordered.next_youtube_id AS next_youtube_id
            FROM (
                SELECT
                    v.youtube_id,
                    LAG(v.youtube_id) OVER (ORDER BY ${orderBySql}) AS previous_youtube_id,
                    LEAD(v.youtube_id) OVER (ORDER BY ${orderBySql}) AS next_youtube_id
                FROM videos v
                JOIN source_channels c ON c.id = v.channel_id
                LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
                ${groupJoin}
                ${selectionJoin}
                ${whereSql}
            ) ordered
            WHERE ordered.youtube_id = :currentYoutubeId
            LIMIT 1
        `;

        const adjacentRow = await this.getOne<{
            previous_youtube_id: string | null;
            next_youtube_id: string | null;
        }>(sql, {
            ...params,
            currentYoutubeId: video.youtube_id
        });

        return {
            previousYoutubeId: adjacentRow?.previous_youtube_id ?? null,
            nextYoutubeId: adjacentRow?.next_youtube_id ?? null
        };
    }

    async getByYoutubeId(youtubeId: string, profileId: number): Promise<ViewerVideoRecord | undefined>
    {
        const sql = `
            SELECT
                v.id,
                v.youtube_id,
                v.channel_id,
                v.title,
                v.description,
                v.published_at,
                v.duration_seconds,
                v.thumbnail_url,
                v.length_classification,
                c.title AS channel_title,
                c.youtube_id AS channel_youtube_id,
                COALESCE(vf.watched, 0) AS watched,
                COALESCE(vf.favorite, 0) AS favorite,
                COALESCE(vf.ignored, 0) AS ignored
            FROM videos v
            JOIN source_channels c ON c.id = v.channel_id
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            WHERE v.youtube_id = :youtubeId
            LIMIT 1
        `;

        return this.getOne<ViewerVideoRecord>(sql, { youtubeId, profileId });
    }

    async list(filters: ViewerVideoQueryFilters, profileId: number): Promise<ViewerVideoRecord[]>
    {
        const querySpec = new ViewerVideoQuerySpec(filters, profileId);
        const { whereSql, groupJoin, selectionJoin, params, limit, offset } = querySpec.buildListQueryParts();
        const orderBySql = querySpec.getOrderBySql();

        const sql = `
            SELECT
                v.id,
                v.youtube_id,
                v.channel_id,
                v.title,
                v.description,
                v.published_at,
                v.duration_seconds,
                v.thumbnail_url,
                v.length_classification,
                c.title AS channel_title,
                c.youtube_id AS channel_youtube_id,
                COALESCE(vf.watched, 0) AS watched,
                COALESCE(vf.favorite, 0) AS favorite,
                COALESCE(vf.ignored, 0) AS ignored
            FROM videos v
            JOIN source_channels c ON c.id = v.channel_id
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            ${groupJoin}
            ${selectionJoin}
            ${whereSql}
            ORDER BY ${orderBySql}
            LIMIT :limit OFFSET :offset
        `;

        return this.listRows<ViewerVideoRecord>(sql, {
            ...params,
            limit,
            offset
        });
    }

    async count(filters: ViewerVideoQueryFilters, profileId: number): Promise<number>
    {
        const querySpec = new ViewerVideoQuerySpec(filters, profileId);
        const { whereSql, groupJoin, selectionJoin, params } = querySpec.buildCountQueryParts();

        const sql = `
            SELECT COUNT(DISTINCT v.id) AS count
            FROM videos v
            JOIN source_channels c ON c.id = v.channel_id
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            ${groupJoin}
            ${selectionJoin}
            ${whereSql}
        `;

        const row = await this.getOne<{ count: number }>(sql, params);
        return row?.count ?? 0;
    }
}
// apply-patch-anchor - do not delete



