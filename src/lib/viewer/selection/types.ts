export type ViewerSelectionFlagKind = 'watched' | 'favorite' | 'ignored';
export type ViewerSelectionFlagValue = 0 | 1;
export type ViewerSelectionControlState = 'unchecked' | 'checked' | 'mixed';

export interface ViewerSelectionVideoSnapshot
{
    id: number;
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
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    currentPageVideoIds: number[];
    currentPageVideos: ViewerSelectionVideoSnapshot[];
    selectedVideoState: Record<number, ViewerSelectionVideoState>;
    baselineSelectedVideoState: Record<number, ViewerSelectionVideoState>;
}

export interface ViewerSelectionContextInput
{
    profileKey: string;
    term?: string;
    watched: 'all' | 'watched' | 'unwatched';
    ignored: 'hide' | 'show';
    dateFromInput: string;
    dateToInput: string;
    channelId: number | null;
    virtualChannelId: number | null;
    sort: string;
}
// apply-patch-anchor - do not delete
