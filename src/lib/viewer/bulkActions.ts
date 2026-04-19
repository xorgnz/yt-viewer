import type {
    BulkActionUndoState,
    ViewerVideo
} from '$lib/viewer/types';
import type {
    ViewerSelectionControlState,
    ViewerSelectionFlagKind,
    ViewerSelectionFlagValue,
    ViewerSelectionState,
    ViewerSelectionVideoSnapshot
} from '$lib/viewer/selection/types';

function getNextBulkFlagValue(controlState: ViewerSelectionControlState): ViewerSelectionFlagValue
{
    return controlState === 'checked' ? 0 : 1;
}

function getBulkActionFeedbackTone(outcome: unknown, ok: unknown): 'success' | 'warning' | 'error'
{
    if (outcome === 'partial_success') {
        return 'warning';
    }

    if (ok === true || outcome === 'full_success') {
        return 'success';
    }

    return 'error';
}

function buildViewerSelectionUndoPayload(state: ViewerSelectionState): BulkActionUndoState | null
{
    const requestedVideoIds = [...state.selectedVideoIds];
    const originalStates = requestedVideoIds
        .map((videoId) => {
            const baselineState = state.baselineSelectedVideoState[videoId];
            if (!baselineState) {
                return null;
            }

            return {
                videoId,
                watched: baselineState.watched,
                favorite: baselineState.favorite,
                ignored: baselineState.ignored
            };
        })
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> => !!snapshot);

    if (requestedVideoIds.length === 0 || originalStates.length === 0) {
        return null;
    }

    return {
        requestedVideoIds,
        originalStates
    };
}

function applyBulkFlagToVisibleVideos(
    videos: ViewerVideo[],
    kind: ViewerSelectionFlagKind,
    value: ViewerSelectionFlagValue,
    updatedVideoIds: number[]
): ViewerVideo[]
{
    const updatedIdSet = new Set(updatedVideoIds);
    if (updatedIdSet.size === 0) {
        return videos;
    }

    return videos.map((video) => {
        if (!updatedIdSet.has(video.id)) {
            return video;
        }

        return {
            ...video,
            [kind]: value
        };
    });
}

function restoreVisibleVideoSnapshots(
    videos: ViewerVideo[],
    restoredStates: ViewerSelectionVideoSnapshot[]
): ViewerVideo[]
{
    const restoredStateMap = new Map<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>();

    for (const restoredState of restoredStates) {
        restoredStateMap.set(restoredState.id, {
            watched: restoredState.watched,
            favorite: restoredState.favorite,
            ignored: restoredState.ignored
        });
    }

    if (restoredStateMap.size === 0) {
        return videos;
    }

    return videos.map((video) => {
        if (!restoredStateMap.has(video.id)) {
            return video;
        }

        return {
            ...video,
            ...restoredStateMap.get(video.id)!
        };
    });
}

function updateVisibleVideoFlag(
    videos: ViewerVideo[],
    videoId: number,
    kind: ViewerSelectionFlagKind,
    value: ViewerSelectionFlagValue
): ViewerVideo[]
{
    return videos.map((video) => {
        if (video.id !== videoId) {
            return video;
        }

        return {
            ...video,
            [kind]: value
        };
    });
}

export const viewerBulkActions = {
    getNextBulkFlagValue,
    getBulkActionFeedbackTone,
    buildViewerSelectionUndoPayload,
    applyBulkFlagToVisibleVideos,
    restoreVisibleVideoSnapshots,
    updateVisibleVideoFlag
};
// apply-patch-anchor - do not delete