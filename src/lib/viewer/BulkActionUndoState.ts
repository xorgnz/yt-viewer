import {
    BulkActionUndoStateEntry,
    type BulkActionUndoStateEntryFields
} from '$lib/viewer/BulkActionUndoStateEntry';

export type BulkActionUndoStateFields = {
    requestedVideoIds: Array<string | number>;
    originalStates: BulkActionUndoStateEntryFields[];
};

export class BulkActionUndoState
{
    readonly requestedVideoIds: Array<string | number>;
    readonly originalStates: BulkActionUndoStateEntry[];

    constructor(fields: BulkActionUndoStateFields)
    {
        this.requestedVideoIds = fields.requestedVideoIds;
        this.originalStates = fields.originalStates.map((state) => new BulkActionUndoStateEntry(state));
    }
}
