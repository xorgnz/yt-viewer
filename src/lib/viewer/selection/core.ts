import { ViewerSelectionSupport } from '$lib/viewer/selection/shared';
import type {
    ViewerSelectionFlagKind,
    ViewerSelectionFlagValue,
    ViewerSelectionState,
    ViewerSelectionVideoSnapshot,
    ViewerSelectionVideoState
} from '$lib/viewer/selection/types';

export class ViewerSelectionStateManager
{
    public create(
        contextKey: string,
        currentPageVideos: ViewerSelectionVideoSnapshot[]
    ): ViewerSelectionState
    {
        const normalizedCurrentPageVideos = ViewerSelectionSupport.normalizeVideoSnapshots(currentPageVideos);

        return {
            contextKey,
            selectedVideoIds: [],
            anchorVideoId: null,
            currentPageVideoIds: ViewerSelectionSupport.createCurrentPageVideoIds(normalizedCurrentPageVideos),
            currentPageVideos: normalizedCurrentPageVideos,
            selectedVideoState: {},
            baselineSelectedVideoState: {}
        };
    }

    public reconcile(
        previousState: ViewerSelectionState | null | undefined,
        contextKey: string,
        currentPageVideos: ViewerSelectionVideoSnapshot[]
    ): ViewerSelectionState
    {
        const normalizedCurrentPageVideos = ViewerSelectionSupport.normalizeVideoSnapshots(currentPageVideos);
        const normalizedCurrentPageIds = ViewerSelectionSupport.createCurrentPageVideoIds(normalizedCurrentPageVideos);

        if (!previousState || previousState.contextKey !== contextKey) {
            return this.create(contextKey, normalizedCurrentPageVideos);
        }

        const selectedVideoIds = ViewerSelectionSupport.normalizeIds(previousState.selectedVideoIds);
        const anchorVideoId = previousState.anchorVideoId != null && selectedVideoIds.includes(previousState.anchorVideoId)
            ? previousState.anchorVideoId
            : null;
        const selectedVideoState = ViewerSelectionSupport.createStateMap(
            selectedVideoIds,
            previousState.selectedVideoState
        );
        const baselineSelectedVideoState = ViewerSelectionSupport.createStateMap(
            selectedVideoIds,
            previousState.baselineSelectedVideoState
        );
        const currentPageVideoState = ViewerSelectionSupport.createCurrentPageVideoStateMap(normalizedCurrentPageVideos);

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

    public toggle(state: ViewerSelectionState, videoId: number): ViewerSelectionState
    {
        const normalizedVideoId = Number(videoId);
        if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
            return state;
        }

        const currentPageVideoState = ViewerSelectionSupport.createCurrentPageVideoStateMap(state.currentPageVideos);
        const wasSelected = state.selectedVideoIds.includes(normalizedVideoId);
        const selectedVideoIds = state.selectedVideoIds.includes(normalizedVideoId)
            ? state.selectedVideoIds.filter((id) => id !== normalizedVideoId)
            : [...state.selectedVideoIds, normalizedVideoId];
        const selectedVideoState = ViewerSelectionSupport.createStateMap(selectedVideoIds, state.selectedVideoState);
        const baselineSelectedVideoState = ViewerSelectionSupport.createStateMap(
            selectedVideoIds,
            state.baselineSelectedVideoState
        );

        if (selectedVideoIds.includes(normalizedVideoId) && currentPageVideoState[normalizedVideoId]) {
            selectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
        }

        if (!wasSelected && selectedVideoIds.includes(normalizedVideoId) && currentPageVideoState[normalizedVideoId]) {
            baselineSelectedVideoState[normalizedVideoId] = currentPageVideoState[normalizedVideoId];
        }

        return {
            ...state,
            selectedVideoIds: ViewerSelectionSupport.normalizeIds(selectedVideoIds),
            anchorVideoId: normalizedVideoId,
            selectedVideoState,
            baselineSelectedVideoState
        };
    }

    public selectSingle(state: ViewerSelectionState, videoId: number): ViewerSelectionState
    {
        const normalizedVideoId = Number(videoId);
        if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
            return state;
        }

        const currentPageVideoState = ViewerSelectionSupport.createCurrentPageVideoStateMap(state.currentPageVideos);
        const selectedVideoState: Record<number, ViewerSelectionVideoState> = {};
        const baselineSelectedVideoState: Record<number, ViewerSelectionVideoState> = {};

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

    public clear(state: ViewerSelectionState): ViewerSelectionState
    {
        return {
            ...state,
            selectedVideoIds: [],
            anchorVideoId: null,
            selectedVideoState: {},
            baselineSelectedVideoState: {}
        };
    }

    public toggleSingle(state: ViewerSelectionState, videoId: number): ViewerSelectionState
    {
        const normalizedVideoId = Number(videoId);
        if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
            return state;
        }

        if (state.selectedVideoIds.length === 1 && state.selectedVideoIds[0] === normalizedVideoId) {
            return this.clear(state);
        }

        return this.selectSingle(state, normalizedVideoId);
    }

    public selectRange(state: ViewerSelectionState, videoId: number): ViewerSelectionState
    {
        const normalizedVideoId = Number(videoId);
        if (!Number.isInteger(normalizedVideoId) || normalizedVideoId <= 0) {
            return state;
        }

        const targetIndex = state.currentPageVideoIds.indexOf(normalizedVideoId);
        const anchorIndex = state.anchorVideoId != null ? state.currentPageVideoIds.indexOf(state.anchorVideoId) : -1;
        const currentPageVideoState = ViewerSelectionSupport.createCurrentPageVideoStateMap(state.currentPageVideos);

        if (targetIndex < 0 || anchorIndex < 0) {
            const selectedVideoIds = ViewerSelectionSupport.normalizeIds([...state.selectedVideoIds, normalizedVideoId]);
            const selectedVideoState = ViewerSelectionSupport.createStateMap(selectedVideoIds, state.selectedVideoState);
            const baselineSelectedVideoState = ViewerSelectionSupport.createStateMap(
                selectedVideoIds,
                state.baselineSelectedVideoState
            );

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
        const selectedVideoIds = ViewerSelectionSupport.normalizeIds([...state.selectedVideoIds, ...rangeIds]);
        const selectedVideoState = ViewerSelectionSupport.createStateMap(selectedVideoIds, state.selectedVideoState);
        const baselineSelectedVideoState = ViewerSelectionSupport.createStateMap(
            selectedVideoIds,
            state.baselineSelectedVideoState
        );

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

    public applyBulkFlag(
        state: ViewerSelectionState,
        kind: ViewerSelectionFlagKind,
        value: ViewerSelectionFlagValue,
        updatedVideoIds: number[]
    ): ViewerSelectionState
    {
        const updatedIdSet = new Set(ViewerSelectionSupport.normalizeIds(updatedVideoIds));
        if (updatedIdSet.size === 0) {
            return state;
        }

        const selectedVideoState = ViewerSelectionSupport.createStateMap(state.selectedVideoIds, state.selectedVideoState);
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

    public restoreVideoStates(
        state: ViewerSelectionState,
        restoredStates: ViewerSelectionVideoSnapshot[]
    ): ViewerSelectionState
    {
        if (restoredStates.length === 0) {
            return state;
        }

        const restoredStateMap = new Map<number, ViewerSelectionVideoState>();

        for (const restoredState of restoredStates) {
            const videoId = Number(restoredState.id);
            if (!Number.isInteger(videoId) || videoId <= 0) {
                continue;
            }

            restoredStateMap.set(videoId, {
                watched: ViewerSelectionSupport.normalizeFlagValue(restoredState.watched),
                favorite: ViewerSelectionSupport.normalizeFlagValue(restoredState.favorite),
                ignored: ViewerSelectionSupport.normalizeFlagValue(restoredState.ignored)
            });
        }

        if (restoredStateMap.size === 0) {
            return state;
        }

        const selectedVideoState = ViewerSelectionSupport.createStateMap(state.selectedVideoIds, state.selectedVideoState);
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
}

export const viewerSelectionStateManager = new ViewerSelectionStateManager();
