export enum ViewerSelectionFlagKind
{
    Watched = 'watched',
    Favorite = 'favorite',
    Ignored = 'ignored'
}

export type ViewerSelectionFlagValue = 0 | 1;

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

// apply-patch-anchor - do not delete
