import type { Video } from '$lib/entities/video';
import { viewerSelectionInspector } from '$lib/viewer/selection/summary';
import {
    ViewerSelectionFlagKind,
    type ViewerSelectionState,
    type ViewerSelectionVideoSnapshot
} from '$lib/viewer/selection/types';

export enum ViewerSelectionControlState
{
    Unchecked = 'unchecked',
    Checked = 'checked',
    Mixed = 'mixed'
}

export interface ViewerPageSelectionSummary
{
    hasActiveSelection: boolean;
    selectedCount: number;
    offPageSelectedCount: number;
    watchedControlState: ViewerSelectionControlState;
    favoriteControlState: ViewerSelectionControlState;
    ignoredControlState: ViewerSelectionControlState;
}

export class ViewerPageSelection
{
    createSnapshots(videos: Video[]): ViewerSelectionVideoSnapshot[]
    {
        return videos.map((video) => ({
            id: video.id,
            watched: video.watched ? 1 : 0,
            favorite: video.favorite ? 1 : 0,
            ignored: video.ignored ? 1 : 0
        }));
    }

    deriveSummary(state: ViewerSelectionState): ViewerPageSelectionSummary
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
            watchedControlState: viewerSelectionInspector.getControlState(state, ViewerSelectionFlagKind.Watched),
            favoriteControlState: viewerSelectionInspector.getControlState(state, ViewerSelectionFlagKind.Favorite),
            ignoredControlState: viewerSelectionInspector.getControlState(state, ViewerSelectionFlagKind.Ignored)
        };
    }
}

export const viewerPageSelection = new ViewerPageSelection();
