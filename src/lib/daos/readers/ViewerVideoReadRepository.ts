import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
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

export class ViewerVideoReadRepository extends SqliteDAO
{
    getByYoutubeId(youtubeId: string, profileId: number): ViewerVideoRecord | undefined
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

        return this.db.prepare(sql).get({ youtubeId, profileId }) as ViewerVideoRecord | undefined;
    }

    list(filters: ViewerVideoQueryFilters, profileId: number): ViewerVideoRecord[]
    {
        const querySpec = new ViewerVideoQuerySpec(filters, profileId);
        const { whereSql, groupJoin, selectionJoin, params, limit, offset } = querySpec.buildListQueryParts();

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
            ORDER BY v.published_at DESC NULLS LAST, v.id DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all({
            ...params,
            limit,
            offset
        }) as ViewerVideoRecord[];
    }

    count(filters: ViewerVideoQueryFilters, profileId: number): number
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

        const row = this.db.prepare(sql).get(params) as { count: number } | undefined;
        return row?.count ?? 0;
    }
}
