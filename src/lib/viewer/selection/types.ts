import type {
    ViewerIgnoredFilter,
    ViewerWatchedFilter
} from '$lib/viewer/ViewerFilters';

export enum ViewerSelectionFlagKind
{
    Watched = 'watched',
    Favorite = 'favorite',
    Ignored = 'ignored'
}

export type ViewerSelectionFlagValue = 0 | 1;

export enum ViewerSelectionControlState
{
    Unchecked = 'unchecked',
    Checked = 'checked',
    Mixed = 'mixed'
}

export type ViewerSelectableId = string;

export interface ViewerSelectionVideoSnapshot
{
    id: string | number;
    watched: ViewerSelectionFlagValue;
    favorite: ViewerSelectionFlagValue;
    ignored: ViewerSelectionFlagValue;
}

export interface ViewerSelectionVideoState
{
    watched: ViewerSelectionFlagValue;
    favorite: ViewerSelectionFlagValue;
    ignored: ViewerSelectionFlagValue;
}

export interface ViewerSelectionState
{
    contextKey: string;
    selectedVideoIds: ViewerSelectableId[];
    anchorVideoId: ViewerSelectableId | null;
    currentPageVideoIds: ViewerSelectableId[];
    currentPageVideos: ViewerSelectionVideoSnapshot[];
    selectedVideoState: Record<ViewerSelectableId, ViewerSelectionVideoState>;
    baselineSelectedVideoState: Record<ViewerSelectableId, ViewerSelectionVideoState>;
}

export interface ViewerSelectionContextInput
{
    profileKey: string;
    term?: string;
    watched: ViewerWatchedFilter;
    ignored: ViewerIgnoredFilter;
    dateFromInput: string;
    dateToInput: string;
    channelId: string | null;
    virtualChannelId: string | null;
    sort: string;
}
// apply-patch-anchor - do not delete
