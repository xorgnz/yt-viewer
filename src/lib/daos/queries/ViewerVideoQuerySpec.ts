import type { ViewerSort } from '$lib/viewer/types';

export interface ViewerVideoQueryFilters
{
    term?: string;
    dateFrom?: number | null;
    dateTo?: number | null;
    watched?: 'all' | 'watched' | 'unwatched';
    ignored?: 'hide' | 'show';
    channelId?: number | null;
    groupId?: number | null;
    sort?: ViewerSort;
    limit?: number;
    offset?: number;
}

export type ViewerVideoQueryParams = Record<string, number | string>;

export interface ViewerVideoQueryParts
{
    whereSql: string;
    groupJoin: string;
    selectionJoin: string;
    params: ViewerVideoQueryParams;
}

export interface ViewerVideoListQueryParts extends ViewerVideoQueryParts
{
    limit: number;
    offset: number;
}

export class ViewerVideoQuerySpec
{
    private readonly filters: ViewerVideoQueryFilters;
    private readonly profileId: number;

    constructor(filters: ViewerVideoQueryFilters, profileId: number)
    {
        this.filters = filters;
        this.profileId = profileId;
    }

    buildCountQueryParts(): ViewerVideoQueryParts
    {
        return this.buildCoreQueryParts();
    }

    buildListQueryParts(): ViewerVideoListQueryParts
    {
        const queryParts = this.buildCoreQueryParts();

        return {
            ...queryParts,
            limit: this.resolveLimit(),
            offset: this.resolveOffset()
        };
    }

    getOrderBySql(): string
    {
        switch (this.resolveSort()) {
            case 'oldest':
                return 'v.published_at IS NULL ASC, v.published_at ASC, v.id ASC';
            case 'title_asc':
                return 'LOWER(v.title) ASC, v.published_at IS NULL ASC, v.published_at DESC, v.id ASC';
            case 'title_desc':
                return 'LOWER(v.title) DESC, v.published_at IS NULL ASC, v.published_at DESC, v.id DESC';
            default:
                return 'v.published_at IS NULL ASC, v.published_at DESC, v.id DESC';
        }
    }

    private buildCoreQueryParts(): ViewerVideoQueryParts
    {
        const where: string[] = [];
        const params: ViewerVideoQueryParams = {
            profileId: this.profileId
        };
        let groupJoin = '';
        let selectionJoin = '';

        // Apply text and publish-date filters first so viewer search behavior stays stable.
        if (this.filters.term) {
            where.push('(v.title LIKE :term OR v.description LIKE :term)');
            params.term = `%${this.filters.term}%`;
        }

        if (this.filters.dateFrom != null) {
            where.push('v.published_at IS NOT NULL AND v.published_at >= :dateFrom');
            params.dateFrom = this.filters.dateFrom;
        }

        if (this.filters.dateTo != null) {
            where.push('v.published_at IS NOT NULL AND v.published_at <= :dateTo');
            params.dateTo = this.filters.dateTo;
        }

        if (this.filters.channelId != null) {
            where.push('v.channel_id = :channelId');
            params.channelId = this.filters.channelId;
        }

        // When a virtual channel is selected, honor assignment mode and selection rules.
        if (this.filters.groupId != null) {
            groupJoin = 'JOIN virtual_channel_assignments ga ON ga.source_channel_id = v.channel_id AND ga.virtual_channel_id = :groupId';
            selectionJoin = 'LEFT JOIN virtual_channel_assignment_video_selections gavs ON (gavs.assignment_id = ga.id AND gavs.video_id = v.id)';
            params.groupId = this.filters.groupId;

            where.push(`(
                ga.mode = 'all'
                OR (ga.mode = 'long_only' AND v.length_classification = 'long')
                OR (ga.mode = 'selected_only' AND COALESCE(gavs.review_state, 'not_yet_reviewed') = 'included')
            )`);
        }

        // Apply profile-specific watch and ignore flags after the structural joins are resolved.
        const watchedFilter = this.filters.watched || 'all';
        if (watchedFilter === 'watched') {
            where.push('COALESCE(vf.watched, 0) = 1');
        } else if (watchedFilter === 'unwatched') {
            where.push('COALESCE(vf.watched, 0) = 0');
        }

        if ((this.filters.ignored || 'hide') !== 'show') {
            where.push('COALESCE(vf.ignored, 0) = 0');
        }

        return {
            whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
            groupJoin,
            selectionJoin,
            params
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

    private resolveSort(): ViewerSort
    {
        switch (this.filters.sort) {
            case 'oldest':
            case 'title_asc':
            case 'title_desc':
                return this.filters.sort;
            default:
                return 'newest';
        }
    }
}
// apply-patch-anchor - do not delete
