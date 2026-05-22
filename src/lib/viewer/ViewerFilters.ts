export enum ViewerSort
{
    Newest = 'newest',
    Oldest = 'oldest',
    TitleAsc = 'title_asc',
    TitleDesc = 'title_desc'
}

export enum ViewerWatchedFilter
{
    All = 'all',
    Watched = 'watched',
    Unwatched = 'unwatched'
}

export enum ViewerIgnoredFilter
{
    Hide = 'hide',
    Show = 'show'
}

export type ViewerFilters = {
    term?: string;
    watched: ViewerWatchedFilter;
    ignored: ViewerIgnoredFilter;
    dateFrom: number | null;
    dateTo: number | null;
    dateFromInput: string;
    dateToInput: string;
    channelId: string | number | null;
    virtualChannelId: string | number | null;
    sort: ViewerSort;
    limit: number;
    offset: number;
};

export type ViewerFilterInputState = {
    termInput: string;
    dateFromInput: string;
    dateToInput: string;
    channelIdInput: string;
    sortMode: ViewerSort;
    limitInput: string;
    watchedMode: ViewerFilters['watched'];
    showIgnored: boolean;
};
