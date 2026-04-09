export type ViewerSelectionFlagKind = 'watched' | 'favorite' | 'ignored';
export type ViewerSelectionFlagValue = 0 | 1;
export type ViewerSelectionControlState = 'unchecked' | 'checked' | 'mixed';

export type ViewerSelectionVideoSnapshot = {
    id: number;
    watched: ViewerSelectionFlagValue;
    favorite: ViewerSelectionFlagValue;
    ignored: ViewerSelectionFlagValue;
};

export type ViewerSelectionState = {
    contextKey: string;
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    currentPageVideoIds: number[];
    currentPageVideos: ViewerSelectionVideoSnapshot[];
    selectedVideoState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>;
    baselineSelectedVideoState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>;
};

type PersistedViewerSelectionState = {
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    selectedVideoState?: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>;
    baselineSelectedVideoState?: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>;
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

function normalizeViewerSelectionFlagValue(value: unknown): ViewerSelectionFlagValue
{
    return Number(value) === 1 ? 1 : 0;
}

function normalizeViewerSelectionVideoSnapshots(videos: ViewerSelectionVideoSnapshot[]): ViewerSelectionVideoSnapshot[]
{
    const snapshotMap = new Map<number, ViewerSelectionVideoSnapshot>();

    for (const video of videos) {
        const id = Number(video?.id);
        if (!Number.isInteger(id) || id <= 0) {
            continue;
        }

        snapshotMap.set(id, {
            id,
            watched: normalizeViewerSelectionFlagValue(video?.watched),
            favorite: normalizeViewerSelectionFlagValue(video?.favorite),
            ignored: normalizeViewerSelectionFlagValue(video?.ignored)
        });
    }

    return [...snapshotMap.values()];
}

function createViewerSelectionStateMap(
    selectedVideoIds: number[],
    selectedVideoState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>> | null | undefined
): Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>
{
    const selectedIdSet = new Set(normalizeViewerSelectionIds(selectedVideoIds));
    const normalizedState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>> = {};

    for (const [rawId, snapshot] of Object.entries(selectedVideoState || {})) {
        const id = Number(rawId);
        if (!selectedIdSet.has(id)) {
            continue;
        }

        normalizedState[id] = {
            watched: normalizeViewerSelectionFlagValue(snapshot?.watched),
            favorite: normalizeViewerSelectionFlagValue(snapshot?.favorite),
            ignored: normalizeViewerSelectionFlagValue(snapshot?.ignored)
        };
    }

    return normalizedState;
}

function createCurrentPageVideoStateMap(
    currentPageVideos: ViewerSelectionVideoSnapshot[]
): Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>
{
    const snapshotMap: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>> = {};

    for (const video of currentPageVideos) {
        snapshotMap[video.id] = {
            watched: video.watched,
            favorite: video.favorite,
            ignored: video.ignored
        };
    }

    return snapshotMap;
}

function createCurrentPageVideoIds(currentPageVideos: ViewerSelectionVideoSnapshot[]): number[]
{
    return currentPageVideos.map((video) => video.id);
}

export function createViewerSelectionState(contextKey: string, currentPageVideos: ViewerSelectionVideoSnapshot[]): ViewerSelectionState
{
    const normalizedCurrentPageVideos = normalizeViewerSelectionVideoSnapshots(currentPageVideos);

    return {
        contextKey,
        selectedVideoIds: [],
        anchorVideoId: null,
        currentPageVideoIds: createCurrentPageVideoIds(normalizedCurrentPageVideos),
        currentPageVideos: normalizedCurrentPageVideos,
        selectedVideoState: {},
        baselineSelectedVideoState: {}
    };
}

export function reconcileViewerSelectionState(
    previousState: ViewerSelectionState | null | undefined,
    contextKey: string,
    currentPageVideos: ViewerSelectionVideoSnapshot[]
): ViewerSelectionState
{
    const normalizedCurrentPageVideos = normalizeViewerSelectionVideoSnapshots(currentPageVideos);
    const normalizedCurrentPageIds = createCurrentPageVideoIds(normalizedCurrentPageVideos);

    if (!previousState || previousState.contextKey !== contextKey) {
        return createViewerSelectionState(contextKey, normalizedCurrentPageVideos);
    }

    const selectedVideoIds = normalizeViewerSelectionIds(previousState.selectedVideoIds);
    const anchorVideoId = previousState.anchorVideoId != null && selectedVideoIds.includes(previousState.anchorVideoId)
        ? previousState.anchorVideoId
        : null;
    const selectedVideoState = createViewerSelectionStateMap(selectedVideoIds, previousState.selectedVideoState);
    const baselineSelectedVideoState = createViewerSelectionStateMap(selectedVideoIds, previousState.baselineSelectedVideoState);
    const currentPageVideoState = createCurrentPageVideoStateMap(normalizedCurrentPageVideos);

    for (const videoId of selectedVideoIds) {
        if (currentPageVideoState[videoId]) {
            selectedVideoState[videoId] = currentPageVideoState[videoId];
        }
    }

    return {
        contextKey,
        selectedVideoIds,
        anchorVideoId,
        currentPageVideoIds: normalizedCurrentPageIds,
        currentPageVideos: normalizedCurrentPageVideos,
        selectedVideoState,
        baselineSelectedVideoState
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

export function loadPersistedViewerSelectionState(contextKey: string, currentPageVideos: ViewerSelectionVideoSnapshot[]): ViewerSelectionState | null
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
        const normalizedCurrentPageVideos = normalizeViewerSelectionVideoSnapshots(currentPageVideos);
        const selectedVideoState = createViewerSelectionStateMap(selectedVideoIds, parsed?.selectedVideoState);
        const baselineSelectedVideoState = createViewerSelectionStateMap(
            selectedVideoIds,
            parsed?.baselineSelectedVideoState ?? parsed?.selectedVideoState
        );
        const currentPageVideoState = createCurrentPageVideoStateMap(normalizedCurrentPageVideos);

        for (const videoId of selectedVideoIds) {
            if (currentPageVideoState[videoId]) {
                selectedVideoState[videoId] = currentPageVideoState[videoId];
            }
        }

        return {
            contextKey,
            selectedVideoIds,
            anchorVideoId,
            currentPageVideoIds: createCurrentPageVideoIds(normalizedCurrentPageVideos),
            currentPageVideos: normalizedCurrentPageVideos,
            selectedVideoState,
            baselineSelectedVideoState
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
        anchorVideoId: state.anchorVideoId,
        selectedVideoState: createViewerSelectionStateMap(state.selectedVideoIds, state.selectedVideoState),
        baselineSelectedVideoState: createViewerSelectionStateMap(state.selectedVideoIds, state.baselineSelectedVideoState)
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

    const currentPageVideoState = createCurrentPageVideoStateMap(state.currentPageVideos);
    const wasSelected = state.selectedVideoIds.includes(normalizedVideoId);
    const selectedVideoIds = state.selectedVideoIds.includes(normalizedVideoId)
        ? state.selectedVideoIds.filter((id) => id !== normalizedVideoId)
        : [...state.selectedVideoIds, normalizedVideoId];
    const selectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.selectedVideoState);
    const baselineSelectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.baselineSelectedVideoState);

    if (selectedVideoIds.includes(normalizedVideoId) && currentPageVideoState[normalizedVideoId]) {
        selectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
    }

    if (!wasSelected && selectedVideoIds.includes(normalizedVideoId) && currentPageVideoState[normalizedVideoId]) {
        baselineSelectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
    }

    return {
        ...state,
        selectedVideoIds: normalizeViewerSelectionIds(selectedVideoIds),
        anchorVideoId: normalizedVideoId,
        selectedVideoState,
        baselineSelectedVideoState
    };
}

export function selectSingleViewerSelectionVideo(state: ViewerSelectionState, videoId: number): ViewerSelectionState
{
    const normalizedVideoId = Number(videoId);
    if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
        return state;
    }

    const currentPageVideoState = createCurrentPageVideoStateMap(state.currentPageVideos);
    const selectedVideoState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>> = {};
    const baselineSelectedVideoState: Record<number, Omit<ViewerSelectionVideoSnapshot, 'id'>> = {};

    if (currentPageVideoState[normalizedVideoId]) {
        selectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
    } else if (state.selectedVideoState[normalizedVideoId]) {
        selectedVideoState[normalizedVideoId] = state.selectedVideoState[normalizedVideoId];
    }

    if (state.baselineSelectedVideoState[normalizedVideoId]) {
        baselineSelectedVideoState[normalizedVideoId] = state.baselineSelectedVideoState[normalizedVideoId];
    } else if (currentPageVideoState[normalizedVideoId]) {
        baselineSelectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
    }

    return {
        ...state,
        selectedVideoIds: [normalizedVideoId],
        anchorVideoId: normalizedVideoId,
        selectedVideoState,
        baselineSelectedVideoState
    };
}

export function toggleSingleViewerSelectionVideo(state: ViewerSelectionState, videoId: number): ViewerSelectionState
{
    const normalizedVideoId = Number(videoId);
    if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
        return state;
    }

    if (state.selectedVideoIds.length === 1 && state.selectedVideoIds[0] === normalizedVideoId) {
        return clearViewerSelectionState(state);
    }

    return selectSingleViewerSelectionVideo(state, normalizedVideoId);
}

export function selectViewerSelectionRange(state: ViewerSelectionState, videoId: number): ViewerSelectionState
{
    const normalizedVideoId = Number(videoId);
    if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
        return state;
    }

    const targetIndex = state.currentPageVideoIds.indexOf(normalizedVideoId);
    const anchorIndex = state.anchorVideoId != null ? state.currentPageVideoIds.indexOf(state.anchorVideoId) : -1;

    const currentPageVideoState = createCurrentPageVideoStateMap(state.currentPageVideos);

    if (targetIndex < 0 || anchorIndex < 0) {
        const selectedVideoIds = normalizeViewerSelectionIds([...state.selectedVideoIds, normalizedVideoId]);
        const selectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.selectedVideoState);
        const baselineSelectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.baselineSelectedVideoState);

        if (currentPageVideoState[normalizedVideoId]) {
            selectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
            if (!state.baselineSelectedVideoState[normalizedVideoId]) {
                baselineSelectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
            }
        }

        return {
            ...state,
            selectedVideoIds,
            anchorVideoId: state.anchorVideoId ?? normalizedVideoId,
            selectedVideoState,
            baselineSelectedVideoState
        };
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    const rangeIds = state.currentPageVideoIds.slice(start, end + 1);
    const selectedVideoIds = normalizeViewerSelectionIds([...state.selectedVideoIds, ...rangeIds]);
    const selectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.selectedVideoState);
    const baselineSelectedVideoState = createViewerSelectionStateMap(selectedVideoIds, state.baselineSelectedVideoState);

    for (const rangeId of rangeIds) {
        if (currentPageVideoState[rangeId]) {
            selectedVideoState[rangeId] = currentPageVideoState[rangeId];
            if (!state.baselineSelectedVideoState[rangeId]) {
                baselineSelectedVideoState[rangeId] = currentPageVideoState[rangeId];
            }
        }
    }

    return {
        ...state,
        selectedVideoIds,
        selectedVideoState,
        baselineSelectedVideoState
    };
}

export function getViewerSelectionControlState(
    state: ViewerSelectionState,
    kind: ViewerSelectionFlagKind
): ViewerSelectionControlState
{
    if (state.selectedVideoIds.length === 0) {
        return 'unchecked';
    }

    let hasChecked = false;
    let hasUnchecked = false;

    for (const videoId of state.selectedVideoIds) {
        const value = state.selectedVideoState[videoId]?.[kind];
        if (value === 1) {
            hasChecked = true;
        } else if (value === 0) {
            hasUnchecked = true;
        } else {
            hasChecked = true;
            hasUnchecked = true;
        }

        if (hasChecked && hasUnchecked) {
            return 'mixed';
        }
    }

    return hasChecked ? 'checked' : 'unchecked';
}

export function applyViewerSelectionBulkFlag(
    state: ViewerSelectionState,
    kind: ViewerSelectionFlagKind,
    value: ViewerSelectionFlagValue,
    updatedVideoIds: number[]
): ViewerSelectionState
{
    const updatedIdSet = new Set(normalizeViewerSelectionIds(updatedVideoIds));
    if (updatedIdSet.size === 0) {
        return state;
    }

    const selectedVideoState = createViewerSelectionStateMap(state.selectedVideoIds, state.selectedVideoState);
    const currentPageVideos = state.currentPageVideos.map((video) => {
        if (!updatedIdSet.has(video.id)) {
            return video;
        }

        return {
            ...video,
            [kind]: value
        };
    });

    for (const videoId of state.selectedVideoIds) {
        if (updatedIdSet.has(videoId) && selectedVideoState[videoId]) {
            selectedVideoState[videoId] = {
                ...selectedVideoState[videoId],
                [kind]: value
            };
        }
    }

    return {
        ...state,
        currentPageVideos,
        selectedVideoState
    };
}

export function restoreViewerSelectionVideoStates(
    state: ViewerSelectionState,
    restoredStates: ViewerSelectionVideoSnapshot[]
): ViewerSelectionState
{
    if (restoredStates.length === 0) {
        return state;
    }

    const restoredStateMap = new Map<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>();
    for (const restoredState of restoredStates) {
        const videoId = Number(restoredState.id);
        if (!Number.isInteger(videoId) || videoId <= 0) {
            continue;
        }

        restoredStateMap.set(videoId, {
            watched: normalizeViewerSelectionFlagValue(restoredState.watched),
            favorite: normalizeViewerSelectionFlagValue(restoredState.favorite),
            ignored: normalizeViewerSelectionFlagValue(restoredState.ignored)
        });
    }

    if (restoredStateMap.size === 0) {
        return state;
    }

    const selectedVideoState = createViewerSelectionStateMap(state.selectedVideoIds, state.selectedVideoState);
    const currentPageVideos = state.currentPageVideos.map((video) => {
        if (!restoredStateMap.has(video.id)) {
            return video;
        }

        return {
            ...video,
            ...restoredStateMap.get(video.id)!
        };
    });

    for (const [videoId, restoredState] of restoredStateMap.entries()) {
        if (selectedVideoState[videoId]) {
            selectedVideoState[videoId] = restoredState;
        }
    }

    return {
        ...state,
        currentPageVideos,
        selectedVideoState
    };
}

export function clearViewerSelectionState(state: ViewerSelectionState): ViewerSelectionState
{
    return {
        ...state,
        selectedVideoIds: [],
        anchorVideoId: null,
        selectedVideoState: {},
        baselineSelectedVideoState: {}
    };
}
