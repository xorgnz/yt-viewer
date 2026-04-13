import type {
    ViewerSelectionControlState,
    ViewerSelectionFlagValue
} from '$lib/viewerSelection';

export type ViewerFilters = {
    term?: string;
    watched: 'all' | 'watched' | 'unwatched';
    ignored: 'hide' | 'show';
    dateFrom: number | null;
    dateTo: number | null;
    dateFromInput: string;
    dateToInput: string;
    channelId: number | null;
    groupId: number | null;
    limit: number;
    offset: number;
};

export type ViewerVideo = {
    id: number;
    youtube_id: string;
    channel_id: number;
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

export type ViewerCardClickHandler = (event: MouseEvent | KeyboardEvent, videoId: number) => void;
export type ViewerCardMouseDownHandler = (event: MouseEvent, videoId: number) => void;

export type ViewerChannel = {
    id: number;
    youtube_id: string;
    title: string;
};

export type ViewerGroup = {
    id: number;
    name: string;
};

export type ViewerPageData = {
    filters: ViewerFilters;
    videos: ViewerVideo[];
    totalCount: number;
    channels: ViewerChannel[];
    groups: ViewerGroup[];
    profileId: number;
    profileKey: string;
    profileName: string;
};

export type BulkActionUndoState = {
    requestedVideoIds: number[];
    originalStates: Array<{
        videoId: number;
        watched: ViewerSelectionFlagValue;
        favorite: ViewerSelectionFlagValue;
        ignored: ViewerSelectionFlagValue;
    }>;
};

export type BulkActionFeedback = {
    message: string;
    tone: 'success' | 'warning' | 'error';
    undo: BulkActionUndoState | null;
};

export type ViewerBulkActionControl = {
    label: string;
    state: ViewerSelectionControlState;
};

export type ViewerVisiblePage = number | 'ellipsis';

export type ViewerFilterInputState = {
    termInput: string;
    dateFromInput: string;
    dateToInput: string;
    channelIdInput: string;
    limitInput: string;
    watchedMode: ViewerFilters['watched'];
    showIgnored: boolean;
};

export type ViewerPaginationState = {
    totalPages: number;
    currentPage: number;
    visiblePages: ViewerVisiblePage[];
};
