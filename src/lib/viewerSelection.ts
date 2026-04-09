export type ViewerSelectionState = {
    contextKey: string;
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    currentPageVideoIds: number[];
};

type ViewerSelectionContextInput = {
    profileKey: string;
    term?: string;
    watched: 'all' | 'watched' | 'unwatched';
    ignored: 'hide' | 'show';
    dateFromInput: string;
    dateToInput: string;
    channelId: number | null;
    groupId: number | null;
};

export function createViewerSelectionContextKey(input: ViewerSelectionContextInput): string
{
    return new URLSearchParams({
        profileKey: input.profileKey,
        term: input.term || '',
        watched: input.watched,
        ignored: input.ignored,
        dateFrom: input.dateFromInput,
        dateTo: input.dateToInput,
        channelId: input.channelId != null ? String(input.channelId) : '',
        groupId: input.groupId != null ? String(input.groupId) : ''
    }).toString();
}

export function normalizeViewerSelectionIds(ids: number[]): number[]
{
    return Array.from(
        new Set(
            ids.filter((value) => Number.isInteger(value) && value > 0)
        )
    );
}

export function createViewerSelectionState(contextKey: string, currentPageVideoIds: number[]): ViewerSelectionState
{
    return {
        contextKey,
        selectedVideoIds: [],
        anchorVideoId: null,
        currentPageVideoIds: normalizeViewerSelectionIds(currentPageVideoIds)
    };
}

export function reconcileViewerSelectionState(
    previousState: ViewerSelectionState | null | undefined,
    contextKey: string,
    currentPageVideoIds: number[]
): ViewerSelectionState
{
    const normalizedCurrentPageIds = normalizeViewerSelectionIds(currentPageVideoIds);

    if (!previousState || previousState.contextKey !== contextKey) {
        return createViewerSelectionState(contextKey, normalizedCurrentPageIds);
    }

    const selectedVideoIds = normalizeViewerSelectionIds(previousState.selectedVideoIds);
    const anchorVideoId = previousState.anchorVideoId != null && selectedVideoIds.includes(previousState.anchorVideoId)
        ? previousState.anchorVideoId
        : null;

    return {
        contextKey,
        selectedVideoIds,
        anchorVideoId,
        currentPageVideoIds: normalizedCurrentPageIds
    };
}

export function getCurrentPageSelectedVideoIds(state: ViewerSelectionState): number[]
{
    const currentPageIdSet = new Set(state.currentPageVideoIds);
    return state.selectedVideoIds.filter((videoId) => currentPageIdSet.has(videoId));
}

export function hasSelectionOutsideCurrentPage(state: ViewerSelectionState): boolean
{
    return state.selectedVideoIds.length > getCurrentPageSelectedVideoIds(state).length;
}
