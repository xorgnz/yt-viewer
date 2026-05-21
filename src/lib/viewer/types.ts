import type {
    ViewerSelectionFlagValue
} from '$lib/viewer/selection/types';

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

export type ViewerVideo = {
    id: string | number;
    youtube_id: string;
    channel_id: string | number;
    title: string;
    description: string;
    published_at: number | null;
    duration_seconds: number | null;
    thumbnail_url: string | null;
    channel_title: string;
    channel_youtube_id: string;
    watched: number;
    favorite: number;
    ignored: number;
};

export type ViewerCardClickHandler = (event: MouseEvent | KeyboardEvent, videoId: string | number) => void;
export type ViewerCardMouseDownHandler = (event: MouseEvent, videoId: string | number) => void;

export type ViewerChannel = {
    id: string | number;
    youtube_id: string;
    title: string;
};

export type ViewerVirtualChannel = {
    id: string | number;
    name: string;
    dailyTimerMax: number | null;
    timerState: ViewerVirtualChannelTimerState;
    timerUsageSeconds: number;
    timerRemainingSeconds: number | null;
    dailyTimerRemainingSeconds: number | null;
    extraTimerSecondsRemaining: number;
    combinedTimerRemainingSeconds: number | null;
    timerWindowStartMs: number;
    timerWindowEndMs: number;
};

export enum ViewerVirtualChannelTimerState
{
    Unlimited = 'unlimited',
    Available = 'available',
    Capped = 'capped'
}

export type ViewerPageData = {
    filters: ViewerFilters;
    videos: ViewerVideo[];
    totalCount: number;
    channels: ViewerChannel[];
    virtualChannels: ViewerVirtualChannel[];
    activeVirtualChannel: ViewerVirtualChannel | null;
    profileId: string | number;
    profileKey: string;
    profileName: string;
};

export type BulkActionUndoState = {
    requestedVideoIds: Array<string | number>;
    originalStates: Array<{
        videoId: string | number;
        watched: ViewerSelectionFlagValue;
        favorite: ViewerSelectionFlagValue;
        ignored: ViewerSelectionFlagValue;
    }>;
};

export type BulkActionFeedback = {
    message: string;
    tone: BulkActionFeedbackTone;
    undo: BulkActionUndoState | null;
};

export enum BulkActionFeedbackTone
{
    Success = 'success',
    Warning = 'warning',
    Error = 'error'
}

export enum ViewerVisiblePageMarker
{
    Ellipsis = 'ellipsis'
}

export type ViewerVisiblePage = number | ViewerVisiblePageMarker;

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

export type ViewerPaginationState = {
    totalPages: number;
    currentPage: number;
    visiblePages: ViewerVisiblePage[];
};
// apply-patch-anchor - do not delete
