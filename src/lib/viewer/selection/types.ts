export type ViewerSelectionFlagKind = 'watched' | 'favorite' | 'ignored';
export type ViewerSelectionFlagValue = 0 | 1;
export type ViewerSelectionControlState = 'unchecked' | 'checked' | 'mixed';
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
    watched: 'all' | 'watched' | 'unwatched';
    ignored: 'hide' | 'show';
    dateFromInput: string;
    dateToInput: string;
    channelId: string | null;
    virtualChannelId: string | null;
    sort: string;
}
// apply-patch-anchor - do not delete
