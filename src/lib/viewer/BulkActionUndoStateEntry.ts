import type {
    ViewerSelectionFlagValue
} from '$lib/viewer/selection/types';

export type BulkActionUndoStateEntryFields = {
    videoId: string | number;
    watched: ViewerSelectionFlagValue;
    favorite: ViewerSelectionFlagValue;
    ignored: ViewerSelectionFlagValue;
};

export class BulkActionUndoStateEntry
{
    readonly videoId: string | number;
    readonly watched: ViewerSelectionFlagValue;
    readonly favorite: ViewerSelectionFlagValue;
    readonly ignored: ViewerSelectionFlagValue;

    constructor(fields: BulkActionUndoStateEntryFields)
    {
        this.videoId = fields.videoId;
        this.watched = fields.watched;
        this.favorite = fields.favorite;
        this.ignored = fields.ignored;
    }
}
