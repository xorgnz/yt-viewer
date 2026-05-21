import {
    ViewerSelectionControlState,
    ViewerSelectionFlagKind
} from '$lib/viewer/selection/types';
import type { ViewerSelectionState } from '$lib/viewer/selection/types';

class ViewerSelectionInspector
{
    public getCurrentPageSelectedIds(state: ViewerSelectionState): string[]
    {
        const currentPageIdSet = new Set(state.currentPageVideoIds);
        return state.selectedVideoIds.filter((videoId) => currentPageIdSet.has(videoId));
    }

    public hasSelectionOutsideCurrentPage(state: ViewerSelectionState): boolean
    {
        return state.selectedVideoIds.length > this.getCurrentPageSelectedIds(state).length;
    }

    public getControlState(
        state: ViewerSelectionState,
        kind: ViewerSelectionFlagKind
    ): ViewerSelectionControlState
    {
        if (state.selectedVideoIds.length === 0) {
            return ViewerSelectionControlState.Unchecked;
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
                return ViewerSelectionControlState.Mixed;
            }
        }

        return hasChecked ? ViewerSelectionControlState.Checked : ViewerSelectionControlState.Unchecked;
    }
}

export const viewerSelectionInspector = new ViewerSelectionInspector();
// apply-patch-anchor - do not delete
