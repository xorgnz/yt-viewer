export type ViewerSelectionState = {
    contextKey: string;
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    currentPageVideoIds: number[];
};

type PersistedViewerSelectionState = {
    selectedVideoIds: number[];
    anchorVideoId: number | null;
};

const VIEWER_SELECTION_STORAGE_PREFIX = 'ytcw-viewer-selection:';

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

export function loadPersistedViewerSelectionState(contextKey: string, currentPageVideoIds: number[]): ViewerSelectionState | null
{
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.sessionStorage.getItem(`${VIEWER_SELECTION_STORAGE_PREFIX}${contextKey}`);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as PersistedViewerSelectionState;
        const selectedVideoIds = normalizeViewerSelectionIds(parsed?.selectedVideoIds || []);
        const anchorVideoId = parsed?.anchorVideoId != null && selectedVideoIds.includes(parsed.anchorVideoId)
            ? parsed.anchorVideoId
            : null;

        return {
            contextKey,
            selectedVideoIds,
            anchorVideoId,
            currentPageVideoIds: normalizeViewerSelectionIds(currentPageVideoIds)
        };
    } catch {
        window.sessionStorage.removeItem(`${VIEWER_SELECTION_STORAGE_PREFIX}${contextKey}`);
        return null;
    }
}

export function persistViewerSelectionState(state: ViewerSelectionState)
{
    if (typeof window === 'undefined') {
        return;
    }

    const storageKey = `${VIEWER_SELECTION_STORAGE_PREFIX}${state.contextKey}`;
    if (state.selectedVideoIds.length === 0 && state.anchorVideoId == null) {
        window.sessionStorage.removeItem(storageKey);
        return;
    }

    const payload: PersistedViewerSelectionState = {
        selectedVideoIds: normalizeViewerSelectionIds(state.selectedVideoIds),
        anchorVideoId: state.anchorVideoId
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
}

export function clearPersistedViewerSelectionState(contextKey: string)
{
    if (typeof window === 'undefined' || !contextKey) {
        return;
    }

    window.sessionStorage.removeItem(`${VIEWER_SELECTION_STORAGE_PREFIX}${contextKey}`);
}

export function toggleViewerSelectionVideo(state: ViewerSelectionState, videoId: number): ViewerSelectionState
{
    const normalizedVideoId = Number(videoId);
    if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
        return state;
    }

    const selectedVideoIds = state.selectedVideoIds.includes(normalizedVideoId)
        ? state.selectedVideoIds.filter((id) => id !== normalizedVideoId)
        : [...state.selectedVideoIds, normalizedVideoId];

    return {
        ...state,
        selectedVideoIds: normalizeViewerSelectionIds(selectedVideoIds),
        anchorVideoId: normalizedVideoId
    };
}

export function selectViewerSelectionRange(state: ViewerSelectionState, videoId: number): ViewerSelectionState
{
    const normalizedVideoId = Number(videoId);
    if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
        return state;
    }

    const targetIndex = state.currentPageVideoIds.indexOf(normalizedVideoId);
    const anchorIndex = state.anchorVideoId != null ? state.currentPageVideoIds.indexOf(state.anchorVideoId) : -1;

    if (targetIndex < 0 || anchorIndex < 0) {
        return {
            ...state,
            selectedVideoIds: normalizeViewerSelectionIds([...state.selectedVideoIds, normalizedVideoId]),
            anchorVideoId: state.anchorVideoId ?? normalizedVideoId
        };
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    const rangeIds = state.currentPageVideoIds.slice(start, end + 1);

    return {
        ...state,
        selectedVideoIds: normalizeViewerSelectionIds([...state.selectedVideoIds, ...rangeIds])
    };
}
