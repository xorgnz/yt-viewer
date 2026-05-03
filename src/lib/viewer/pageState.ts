import type {
    ViewerFilterInputState,
    ViewerFilters,
    ViewerVirtualChannel,
    ViewerPaginationState,
    ViewerVideo,
    ViewerVisiblePage
} from '$lib/viewer/types';
import {
    type ViewerSelectionControlState,
    type ViewerSelectionState,
    type ViewerSelectionVideoSnapshot
} from '$lib/viewer/selection/types';
import { viewerSelectionInspector } from '$lib/viewer/selection/summary';

export const FILTER_DEBOUNCE_MS = 450;

type ViewerSelectionSummary = {
    hasActiveSelection: boolean;
    selectedCount: number;
    offPageSelectedCount: number;
    watchedControlState: ViewerSelectionControlState;
    favoriteControlState: ViewerSelectionControlState;
    ignoredControlState: ViewerSelectionControlState;
};

function buildViewerPageHref(filters: ViewerFilters, page: number): string
{
    return `?${new URLSearchParams({
        term: filters.term || '',
        watched: filters.watched,
        ignored: filters.ignored,
        dateFrom: filters.dateFromInput,
        dateTo: filters.dateToInput,
        channelId: filters.channelId != null ? String(filters.channelId) : '',
        groupId: filters.groupId != null ? String(filters.groupId) : '',
        sort: filters.sort,
        limit: String(filters.limit),
        offset: String((page - 1) * filters.limit)
    }).toString()}`;
}

function buildViewerWatchHref(filters: ViewerFilters, videoYoutubeId: string): string
{
    const query = new URLSearchParams({
        term: filters.term || '',
        watched: filters.watched,
        ignored: filters.ignored,
        dateFrom: filters.dateFromInput,
        dateTo: filters.dateToInput,
        channelId: filters.channelId != null ? String(filters.channelId) : '',
        groupId: filters.groupId != null ? String(filters.groupId) : '',
        sort: filters.sort
    }).toString();

    return query
        ? `/viewer/watch/${videoYoutubeId}?${query}`
        : `/viewer/watch/${videoYoutubeId}`;
}

function getViewerVisiblePages(current: number, total: number): ViewerVisiblePage[]
{
    if (total <= 11) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    const windowSize = 9;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(2, current - halfWindow);
    let end = Math.min(total - 1, current + halfWindow);

    if ((end - start + 1) < windowSize) {
        if (start === 2) {
            end = Math.min(total - 1, start + windowSize - 1);
        } else if (end === total - 1) {
            start = Math.max(2, end - windowSize + 1);
        }
    }

    const pages: ViewerVisiblePage[] = [1];

    if (start > 2) {
        pages.push('ellipsis');
    }

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (end < total - 1) {
        pages.push('ellipsis');
    }

    pages.push(total);
    return pages;
}

function deriveViewerPaginationState(filters: ViewerFilters, totalCount: number): ViewerPaginationState
{
    const totalPages = Math.max(1, Math.ceil(totalCount / filters.limit));
    const currentPage = Math.min(totalPages, Math.floor(filters.offset / filters.limit) + 1);

    return {
        totalPages,
        currentPage,
        visiblePages: getViewerVisiblePages(currentPage, totalPages)
    };
}

function deriveViewerFilterInputState(filters: ViewerFilters): ViewerFilterInputState
{
    return {
        termInput: filters.term || '',
        dateFromInput: filters.dateFromInput,
        dateToInput: filters.dateToInput,
        channelIdInput: filters.channelId != null ? String(filters.channelId) : '',
        sortMode: filters.sort,
        limitInput: String(filters.limit),
        watchedMode: filters.watched,
        showIgnored: filters.ignored === 'show'
    };
}

function buildViewerFilterQuery(
    filters: ViewerFilters,
    inputState: ViewerFilterInputState
): string
{
    const params = new URLSearchParams({
        term: inputState.termInput,
        watched: inputState.watchedMode === 'watched' ? 'watched' : 'all',
        ignored: inputState.showIgnored ? 'show' : 'hide',
        dateFrom: inputState.dateFromInput,
        dateTo: inputState.dateToInput,
        channelId: inputState.channelIdInput,
        groupId: filters.groupId != null ? String(filters.groupId) : '',
        sort: inputState.sortMode,
        limit: inputState.limitInput,
        offset: '0'
    });

    if (inputState.watchedMode === 'unwatched') {
        params.set('unwatchedOnly', '1');
    }

    if (inputState.showIgnored) {
        params.set('showIgnored', '1');
    }

    return params.toString();
}

function findActiveVirtualChannel(
    groups: ViewerVirtualChannel[],
    groupId: number | null
): ViewerVirtualChannel | null
{
    return groups.find((group) => group.id === groupId) ?? null;
}

function createViewerSelectionSnapshots(videos: ViewerVideo[]): ViewerSelectionVideoSnapshot[]
{
    return videos.map((video) => ({
        id: video.id,
        watched: video.watched ? 1 : 0,
        favorite: video.favorite ? 1 : 0,
        ignored: video.ignored ? 1 : 0
    }));
}

function deriveViewerSelectionSummary(state: ViewerSelectionState): ViewerSelectionSummary
{
    const hasActiveSelection = state.selectedVideoIds.length > 0;
    const selectedCount = state.selectedVideoIds.length;
    const offPageSelectedCount = viewerSelectionInspector.hasSelectionOutsideCurrentPage(state)
        ? selectedCount - viewerSelectionInspector.getCurrentPageSelectedIds(state).length
        : 0;

    return {
        hasActiveSelection,
        selectedCount,
        offPageSelectedCount,
        watchedControlState: viewerSelectionInspector.getControlState(state, 'watched'),
        favoriteControlState: viewerSelectionInspector.getControlState(state, 'favorite'),
        ignoredControlState: viewerSelectionInspector.getControlState(state, 'ignored')
    };
}

export const viewerPageState = {
    buildViewerPageHref,
    buildViewerWatchHref,
    deriveViewerPaginationState,
    deriveViewerFilterInputState,
    buildViewerFilterQuery,
    findActiveVirtualChannel,
    createViewerSelectionSnapshots,
    deriveViewerSelectionSummary
};
// apply-patch-anchor - do not delete
