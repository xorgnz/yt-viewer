import type { ViewerSort } from '$lib/viewer/types';

export type ViewerWatchedFilter = 'all' | 'watched' | 'unwatched';
export type ViewerIgnoredFilter = 'hide' | 'show';

export type ViewerQueryFilters = {
    term?: string;
    watched: ViewerWatchedFilter;
    ignored: ViewerIgnoredFilter;
    dateFrom: number | null;
    dateTo: number | null;
    dateFromInput: string;
    dateToInput: string;
    channelId: number | null;
    virtualChannelId: number | null;
    sort: ViewerSort;
    limit: number;
    offset: number;
};

export class ViewerQueryParser
{
    static parse(url: URL, activeProfileKey: string): ViewerQueryFilters
    {
        const term = url.searchParams.get('term') || undefined;
        const watchedParamRaw = url.searchParams.get('watched');
        const unwatchedOnly = url.searchParams.get('unwatchedOnly');
        const showIgnored = url.searchParams.get('showIgnored');
        const dateFromInput = url.searchParams.get('dateFrom')?.trim() || '';
        const dateToInput = url.searchParams.get('dateTo')?.trim() || '';
        const sort = ViewerQueryParser.parseSort(url.searchParams.get('sort'));

        // Preserve the legacy watched/ignored query compatibility while normalizing the final filters.
        const watchedParam = unwatchedOnly === '1'
            ? 'unwatched'
            : (watchedParamRaw ?? (activeProfileKey === 'child' ? 'unwatched' : 'all'));
        const ignoredParam = showIgnored === '1'
            ? 'show'
            : (url.searchParams.get('ignored') || 'hide');

        return {
            term,
            watched: watchedParam === 'watched' || watchedParam === 'unwatched' ? watchedParam : 'all',
            ignored: ignoredParam === 'show' ? 'show' : 'hide',
            dateFrom: ViewerQueryParser.parseDateOnly(dateFromInput, 'start'),
            dateTo: ViewerQueryParser.parseDateOnly(dateToInput, 'end'),
            dateFromInput,
            dateToInput,
            channelId: ViewerQueryParser.parseOptionalNumber(url.searchParams.get('channelId')),
            virtualChannelId: ViewerQueryParser.parseOptionalNumber(url.searchParams.get('virtualChannelId')),
            sort,
            limit: ViewerQueryParser.parseOptionalNumber(url.searchParams.get('limit')) ?? 200,
            offset: ViewerQueryParser.parseOptionalNumber(url.searchParams.get('offset')) ?? 0
        };
    }

    private static parseOptionalNumber(value: string | null): number | null
    {
        return value ? Number(value) : null;
    }

    private static parseSort(value: string | null): ViewerSort
    {
        switch ((value || '').trim()) {
            case 'oldest':
            case 'title_asc':
            case 'title_desc':
                return value as ViewerSort;
            default:
                return 'newest';
        }
    }

    private static parseDateOnly(value: string | null, boundary: 'start' | 'end'): number | null
    {
        if (!value) {
            return null;
        }

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
        if (!match) {
            return null;
        }

        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);

        if (boundary === 'start') {
            return new Date(year, month, day, 0, 0, 0, 0).getTime();
        }

        return new Date(year, month, day, 23, 59, 59, 999).getTime();
    }
}
// apply-patch-anchor - do not delete
