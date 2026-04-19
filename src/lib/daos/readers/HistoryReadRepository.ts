import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { PostgresDAO } from '$lib/daos/shared/PostgresDAO';
import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
import {
    HistorySessionReadQuerySpec,
    HistoryVideoSummaryReadQuerySpec,
    type HistoryReadFilters
} from '$lib/daos/queries/HistoryReadQuerySpec';

export interface HistorySessionRecord
{
    session_started_at: number;
    last_updated_at: number;
    time_watched_seconds: number;
    profile_id: number;
    video_id: number;
    youtube_id: string;
    title: string;
    channel_id: number;
    channel_title: string;
}

export interface HistoryVideoSummaryRecord
{
    profile_id: number;
    video_id: number;
    youtube_id: string;
    title: string;
    channel_id: number;
    channel_title: string;
    total_time_watched_seconds: number;
    session_count: number;
    latest_session_started_at: number;
    latest_last_updated_at: number;
}

export class HistoryReadRepository extends SqliteDAO
{
    listSessions(filters: HistoryReadFilters): HistorySessionRecord[]
    {
        const querySpec = new HistorySessionReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.session_started_at,
                h.last_updated_at,
                h.time_watched_seconds,
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            ORDER BY h.session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all({
            ...params,
            limit,
            offset
        }) as HistorySessionRecord[];
    }

    listVideoSummaries(filters: HistoryReadFilters): HistoryVideoSummaryRecord[]
    {
        const querySpec = new HistoryVideoSummaryReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title,
                SUM(h.time_watched_seconds) AS total_time_watched_seconds,
                COUNT(*) AS session_count,
                MAX(h.session_started_at) AS latest_session_started_at,
                MAX(h.last_updated_at) AS latest_last_updated_at
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            GROUP BY
                h.profile_id,
                v.id,
                v.youtube_id,
                v.title,
                c.id,
                c.title
            ORDER BY latest_session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.db.prepare(sql).all({
            ...params,
            limit,
            offset
        }) as HistoryVideoSummaryRecord[];
    }
}

export class PostgresHistoryReadRepository extends PostgresDAO
{
    async listSessions(filters: HistoryReadFilters): Promise<HistorySessionRecord[]>
    {
        const querySpec = new HistorySessionReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.session_started_at,
                h.last_updated_at,
                h.time_watched_seconds,
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            ORDER BY h.session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.listRows<HistorySessionRecord>(sql, {
            ...params,
            limit,
            offset
        });
    }

    async listVideoSummaries(filters: HistoryReadFilters): Promise<HistoryVideoSummaryRecord[]>
    {
        const querySpec = new HistoryVideoSummaryReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title,
                SUM(h.time_watched_seconds)::INTEGER AS total_time_watched_seconds,
                COUNT(*)::INTEGER AS session_count,
                MAX(h.session_started_at) AS latest_session_started_at,
                MAX(h.last_updated_at) AS latest_last_updated_at
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            GROUP BY
                h.profile_id,
                v.id,
                v.youtube_id,
                v.title,
                c.id,
                c.title
            ORDER BY latest_session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.listRows<HistoryVideoSummaryRecord>(sql, {
            ...params,
            limit,
            offset
        });
    }
}

export class MySqlHistoryReadRepository extends MySqlDAO
{
    async listSessions(filters: HistoryReadFilters): Promise<HistorySessionRecord[]>
    {
        const querySpec = new HistorySessionReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.session_started_at,
                h.last_updated_at,
                h.time_watched_seconds,
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            ORDER BY h.session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.listRows<HistorySessionRecord>(sql, {
            ...params,
            limit,
            offset
        });
    }

    async listVideoSummaries(filters: HistoryReadFilters): Promise<HistoryVideoSummaryRecord[]>
    {
        const querySpec = new HistoryVideoSummaryReadQuerySpec(filters);
        const { whereSql, params, limit, offset } = querySpec.buildQueryParts();

        const sql = `
            SELECT
                h.profile_id,
                v.id AS video_id,
                v.youtube_id,
                v.title,
                c.id AS channel_id,
                c.title AS channel_title,
                SUM(h.time_watched_seconds) AS total_time_watched_seconds,
                COUNT(*) AS session_count,
                MAX(h.session_started_at) AS latest_session_started_at,
                MAX(h.last_updated_at) AS latest_last_updated_at
            FROM watch_history h
            JOIN videos v ON v.id = h.video_id
            JOIN source_channels c ON c.id = v.channel_id
            ${whereSql}
            GROUP BY
                h.profile_id,
                v.id,
                v.youtube_id,
                v.title,
                c.id,
                c.title
            ORDER BY latest_session_started_at DESC
            LIMIT :limit OFFSET :offset
        `;

        return this.listRows<HistoryVideoSummaryRecord>(sql, {
            ...params,
            limit,
            offset
        });
    }
}
// apply-patch-anchor - do not delete
