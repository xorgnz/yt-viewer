import type {
    BulkActionUndoState,
} from '$lib/viewer/BulkActionUndoState';
import { BulkActionFeedbackTone } from '$lib/viewer/BulkActionFeedback';
import type { ViewerVideo } from '$lib/viewer/ViewerVideo';
import {
    ViewerSelectionControlState,
    ViewerSelectionFlagKind
} from '$lib/viewer/selection/types';
import type {
    ViewerSelectionFlagValue,
    ViewerSelectionState,
    ViewerSelectionVideoSnapshot
} from '$lib/viewer/selection/types';

function getNextBulkFlagValue(controlState: ViewerSelectionControlState): ViewerSelectionFlagValue
{
    return controlState === ViewerSelectionControlState.Checked ? 0 : 1;
}

function getBulkActionFeedbackTone(outcome: unknown, ok: unknown): BulkActionFeedbackTone
{
    if (outcome === 'partial_success') {
        return BulkActionFeedbackTone.Warning;
    }

    if (ok === true || outcome === 'full_success') {
        return BulkActionFeedbackTone.Success;
    }

    return BulkActionFeedbackTone.Error;
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
    updatedVideoIds: Array<string | number>
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
    const restoredStateMap = new Map<string, Omit<ViewerSelectionVideoSnapshot, 'id'>>();

    for (const restoredState of restoredStates) {
        restoredStateMap.set(String(restoredState.id), {
            watched: restoredState.watched,
            favorite: restoredState.favorite,
            ignored: restoredState.ignored
        });
    }

    if (restoredStateMap.size === 0) {
        return videos;
    }

    return videos.map((video) => {
        const normalizedVideoId = String(video.id);
        if (!restoredStateMap.has(normalizedVideoId)) {
            return video;
        }

        return {
            ...video,
            ...restoredStateMap.get(normalizedVideoId)!
        };
    });
}

export const viewerBulkActions = {
    getNextBulkFlagValue,
    getBulkActionFeedbackTone,
    buildViewerSelectionUndoPayload,
    applyBulkFlagToVisibleVideos,
    restoreVisibleVideoSnapshots
};
// apply-patch-anchor - do not delete
