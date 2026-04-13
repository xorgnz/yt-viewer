import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import {
    ViewerVideoQuerySpec,
    type ViewerVideoQueryFilters
} from '$lib/daos/queries/ViewerVideoQuerySpec';
import type { Video } from '$lib/entities/video';

export class VideoDAO extends SqliteDAO
{
    upsert(video: Omit<Video, 'id'> | Partial<Video> & { youtube_id: string; channel_id: number; title: string })
    {
        const stmt = this.db.prepare(`
            INSERT INTO videos(youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES(@youtube_id,@channel_id,@title,@description,@published_at,@duration_seconds,@thumbnail_url,@length_classification)
            ON CONFLICT(youtube_id) DO UPDATE SET
                channel_id=excluded.channel_id,
                title=excluded.title,
                description=excluded.description,
                published_at=excluded.published_at,
                duration_seconds=excluded.duration_seconds,
                thumbnail_url=excluded.thumbnail_url,
                length_classification=excluded.length_classification
        `);
        stmt.run({
            length_classification: 'unknown',
            ...(video as any)
        });
    }

    getForViewerByYoutubeId(youtubeId: string, profileId: number): {
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
    } | undefined
    {
        const sql = `
            SELECT
                v.id, v.youtube_id, v.channel_id, v.title, v.description, v.published_at, v.duration_seconds, v.thumbnail_url, v.length_classification,
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
        return this.db.prepare(sql).get({ youtubeId, profileId }) as any | undefined;
    }

    get(id: number): Video | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE id = ?`).get(id) as Video | undefined;
    }

    listExistingIds(ids: number[]): number[]
    {
        if (ids.length === 0) {
            return [];
        }

        const placeholders = ids.map(() => '?').join(',');
        const rows = this.db.prepare(`
            SELECT id
            FROM videos
            WHERE id IN (${placeholders})
        `).all(...ids) as Array<{ id: number }>;

        return rows.map((row) => row.id);
    }

    getByExternalId(external_id: string): Video | undefined
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE youtube_id = ?`).get(external_id) as Video | undefined;
    }

    listByChannel(channel_id: number): Video[]
    {
        return this.db.prepare(`SELECT id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification FROM videos WHERE channel_id = ? ORDER BY published_at DESC NULLS LAST, id DESC`).all(channel_id) as Video[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM videos WHERE id = ?`).run(id);
    }

    listForViewer(filters: ViewerVideoQueryFilters, profileId: number): Array<{
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
        watched: number; // 0/1
        favorite: number; // 0/1
        ignored: number; // 0/1
    }>
    {
        const querySpec = new ViewerVideoQuerySpec(filters, profileId);
        const { whereSql, groupJoin, selectionJoin, params, limit, offset } = querySpec.buildListQueryParts();

        const sql = `
            SELECT
                v.id, v.youtube_id, v.channel_id, v.title, v.description, v.published_at, v.duration_seconds, v.thumbnail_url, v.length_classification,
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
        }) as any[];
    }

    countForViewer(filters: ViewerVideoQueryFilters, profileId: number): number
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
