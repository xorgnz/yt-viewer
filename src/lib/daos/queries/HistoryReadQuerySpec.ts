export interface HistoryReadFilters
{
    profileId?: number | null;
    channelId?: number | null;
    dateFrom?: number | null;
    dateTo?: number | null;
    limit?: number;
    offset?: number;
}

export type HistoryReadQueryParams = Record<string, number>;

export interface HistoryReadQueryParts
{
    whereSql: string;
    params: HistoryReadQueryParams;
    limit: number;
    offset: number;
}

abstract class HistoryReadQuerySpec
{
    protected readonly filters: HistoryReadFilters;

    constructor(filters: HistoryReadFilters)
    {
        this.filters = filters;
    }

    buildQueryParts(): HistoryReadQueryParts
    {
        const where: string[] = [];
        const params: HistoryReadQueryParams = {};

        // Constrain history reads to the selected profile, channel, and date range.
        if (this.filters.profileId != null) {
            where.push('h.profile_id = :profileId');
            params.profileId = this.filters.profileId;
        }

        if (this.filters.channelId != null) {
            where.push('v.channel_id = :channelId');
            params.channelId = this.filters.channelId;
        }

        if (this.filters.dateFrom != null) {
            where.push('h.session_started_at >= :dateFrom');
            params.dateFrom = this.filters.dateFrom;
        }

        if (this.filters.dateTo != null) {
            where.push('h.session_started_at <= :dateTo');
            params.dateTo = this.filters.dateTo;
        }

        return {
            whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
            params,
            limit: this.resolveLimit(),
            offset: this.resolveOffset()
        };
    }

    private resolveLimit(): number
    {
        return Math.max(0, Math.min(1000, this.filters.limit ?? 100));
    }

    private resolveOffset(): number
    {
        return Math.max(0, this.filters.offset ?? 0);
    }
}

export class HistorySessionReadQuerySpec extends HistoryReadQuerySpec
{
}

export class HistoryVideoSummaryReadQuerySpec extends HistoryReadQuerySpec
{
}
// apply-patch-anchor - do not delete