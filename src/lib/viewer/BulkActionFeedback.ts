import {
    BulkActionUndoState,
    type BulkActionUndoStateFields
} from '$lib/viewer/BulkActionUndoState';

export enum BulkActionFeedbackTone
{
    Success = 'success',
    Warning = 'warning',
    Error = 'error'
}

export type BulkActionFeedbackFields = {
    message: string;
    tone: BulkActionFeedbackTone;
    undo: BulkActionUndoStateFields | null;
};

export class BulkActionFeedback
{
    readonly message: string;
    readonly tone: BulkActionFeedbackTone;
    readonly undo: BulkActionUndoState | null;

    constructor(fields: BulkActionFeedbackFields)
    {
        this.message = fields.message;
        this.tone = fields.tone;
        this.undo = fields.undo == null ? null : new BulkActionUndoState(fields.undo);
    }
}
