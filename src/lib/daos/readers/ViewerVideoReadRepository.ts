import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { PostgresDAO } from '$lib/daos/shared/PostgresDAO';
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
    findAdjacentYoutubeIds(
        video: Pick<ViewerVideoRecord, 'id' | 'channel_id' | 'published_at'>,
        profileId: number
    ): { previousYoutubeId: string | null; nextYoutubeId: string | null }
    {
        const params = {
            currentId: video.id,
            channelId: video.channel_id,
            currentPublishedAt: video.published_at ?? 0,
            currentPublishedAtIsNull: video.published_at == null ? 1 : 0,
            profileId
        };

        const previousSql = `
            SELECT v.youtube_id AS youtube_id
            FROM videos v
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            WHERE v.channel_id = :channelId
              AND v.id <> :currentId
              AND COALESCE(vf.ignored, 0) = 0
              AND (
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END < :currentPublishedAtIsNull
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) < :currentPublishedAt
                )
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) = :currentPublishedAt
                    AND v.id < :currentId
                )
              )
            ORDER BY
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END DESC,
                v.published_at DESC,
                v.id DESC
            LIMIT 1
        `;

        const nextSql = `
            SELECT v.youtube_id AS youtube_id
            FROM videos v
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            WHERE v.channel_id = :channelId
              AND v.id <> :currentId
              AND COALESCE(vf.ignored, 0) = 0
              AND (
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END > :currentPublishedAtIsNull
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) > :currentPublishedAt
                )
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) = :currentPublishedAt
                    AND v.id > :currentId
                )
              )
            ORDER BY
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END ASC,
                v.published_at ASC,
                v.id ASC
            LIMIT 1
        `;

        const previousRow = this.db.prepare(previousSql).get(params) as { youtube_id: string } | undefined;
        const nextRow = this.db.prepare(nextSql).get(params) as { youtube_id: string } | undefined;

        return {
            previousYoutubeId: previousRow?.youtube_id ?? null,
            nextYoutubeId: nextRow?.youtube_id ?? null
        };
    }

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

export class PostgresViewerVideoReadRepository extends PostgresDAO
{
    async findAdjacentYoutubeIds(
        video: Pick<ViewerVideoRecord, 'id' | 'channel_id' | 'published_at'>,
        profileId: number
    ): Promise<{ previousYoutubeId: string | null; nextYoutubeId: string | null }>
    {
        const params = {
            currentId: video.id,
            channelId: video.channel_id,
            currentPublishedAt: video.published_at ?? 0,
            currentPublishedAtIsNull: video.published_at == null ? 1 : 0,
            profileId
        };

        const previousSql = `
            SELECT v.youtube_id AS youtube_id
            FROM videos v
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            WHERE v.channel_id = :channelId
              AND v.id <> :currentId
              AND COALESCE(vf.ignored, 0) = 0
              AND (
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END < :currentPublishedAtIsNull
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) < :currentPublishedAt
                )
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) = :currentPublishedAt
                    AND v.id < :currentId
                )
              )
            ORDER BY
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END DESC,
                v.published_at DESC,
                v.id DESC
            LIMIT 1
        `;

        const nextSql = `
            SELECT v.youtube_id AS youtube_id
            FROM videos v
            LEFT JOIN video_flags vf ON (vf.video_id = v.id AND vf.profile_id = :profileId)
            WHERE v.channel_id = :channelId
              AND v.id <> :currentId
              AND COALESCE(vf.ignored, 0) = 0
              AND (
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END > :currentPublishedAtIsNull
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) > :currentPublishedAt
                )
                OR (
                    CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END = :currentPublishedAtIsNull
                    AND COALESCE(v.published_at, 0) = :currentPublishedAt
                    AND v.id > :currentId
                )
              )
            ORDER BY
                CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END ASC,
                v.published_at ASC,
                v.id ASC
            LIMIT 1
        `;

        const previousRow = await this.getOne<{ youtube_id: string }>(previousSql, params);
        const nextRow = await this.getOne<{ youtube_id: string }>(nextSql, params);

        return {
            previousYoutubeId: previousRow?.youtube_id ?? null,
            nextYoutubeId: nextRow?.youtube_id ?? null
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
            SELECT COUNT(DISTINCT v.id)::INTEGER AS count
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