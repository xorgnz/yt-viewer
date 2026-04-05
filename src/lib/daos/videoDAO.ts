import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
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

    listForViewer(filters: {
        term?: string;
        dateFrom?: number | null;
        dateTo?: number | null;
        watched?: 'all' | 'watched' | 'unwatched';
        ignored?: 'hide' | 'show';
        channelId?: number | null;
        groupId?: number | null;
        limit?: number;
        offset?: number;
    }, profileId: number): Array<{
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
        const where: string[] = [];
        const params: Record<string, any> = { profileId };

        // Optional JOINs
        let groupJoin = '';
        let selectionJoin = '';

        if (filters.term) {
            where.push('(v.title LIKE :term OR v.description LIKE :term)');
            params.term = `%${filters.term}%`;
        }
        if (filters.dateFrom != null) {
            where.push('v.published_at IS NOT NULL AND v.published_at >= :dateFrom');
            params.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo != null) {
            where.push('v.published_at IS NOT NULL AND v.published_at <= :dateTo');
            params.dateTo = filters.dateTo;
        }
        if (filters.channelId != null) {
            where.push('v.channel_id = :channelId');
            params.channelId = filters.channelId;
        }
        if (filters.groupId != null) {
            groupJoin = 'JOIN virtual_channel_assignments ga ON ga.source_channel_id = v.channel_id AND ga.virtual_channel_id = :groupId';
            selectionJoin = 'LEFT JOIN virtual_channel_assignment_video_selections gavs ON (gavs.assignment_id = ga.id AND gavs.video_id = v.id)';
            params.groupId = filters.groupId;

            // Apply the virtual-channel assignment mode rules to the effective viewer set.
            where.push(`(
                ga.mode = 'all'
                OR (ga.mode = 'long_only' AND v.length_classification = 'long')
                OR (ga.mode = 'selected_only' AND COALESCE(gavs.review_state, 'not_yet_reviewed') = 'included')
            )`);
        }

        // Watched filter via left join flags
        const watchedFilter = filters.watched || 'all';
        if (watchedFilter === 'watched') {
            where.push('COALESCE(vf.watched, 0) = 1');
        } else if (watchedFilter === 'unwatched') {
            where.push('COALESCE(vf.watched, 0) = 0');
        }

        // Ignored filter (default hide)
        if ((filters.ignored || 'hide') !== 'show') {
            where.push('COALESCE(vf.ignored, 0) = 0');
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const limit = Math.max(0, Math.min(1000, filters.limit ?? 100));
        const offset = Math.max(0, filters.offset ?? 0);
        params.limit = limit;
        params.offset = offset;

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

        return this.db.prepare(sql).all(params) as any[];
    }
}
