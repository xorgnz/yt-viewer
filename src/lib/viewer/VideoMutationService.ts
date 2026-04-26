import { deserialize } from '$app/forms';
import type { BulkActionUndoState, ViewerVideo } from '$lib/viewer/types';
import type { ViewerSelectionFlagKind, ViewerSelectionFlagValue } from '$lib/viewer/selection/types';

type MutationActionResult = {
    type: string;
    data?: unknown;
};

type ViewerBulkActionOutcome = 'full_success' | 'partial_success' | 'failed';

export type ViewerBulkMutationResult = {
    ok: boolean;
    outcome: ViewerBulkActionOutcome;
    message: string;
    succeededIds: number[];
};

export class VideoMutationService
{
    private readonly toggleFlagAction: string;
    private readonly bulkUpdateFlagsAction: string;
    private readonly restoreSelectionStateAction: string;

    constructor(
        options?: {
            toggleFlagAction?: string;
            bulkUpdateFlagsAction?: string;
            restoreSelectionStateAction?: string;
        }
    )
    {
        this.toggleFlagAction = options?.toggleFlagAction ?? '?/toggleFlag';
        this.bulkUpdateFlagsAction = options?.bulkUpdateFlagsAction ?? '?/bulkUpdateFlags';
        this.restoreSelectionStateAction = options?.restoreSelectionStateAction ?? '?/restoreSelectionState';
    }

    async toggleVideoFlag(
        video: ViewerVideo,
        kind: ViewerSelectionFlagKind,
        value: ViewerSelectionFlagValue
    ): Promise<ViewerVideo | null>
    {
        const form = new FormData();
        form.set('videoId', String(video.id));
        form.set('kind', kind);
        form.set('value', String(value));

        const result = await this.postAction(this.toggleFlagAction, form);

        if (result.type !== 'success') {
            return null;
        }

        return {
            ...video,
            [kind]: value
        };
    }

    async bulkUpdateFlags(input: {
        kind: ViewerSelectionFlagKind;
        value: ViewerSelectionFlagValue;
        videoIds: number[];
        selectionContextKey: string | null;
        selectedCount: number;
        spansMultiplePages: boolean;
    }): Promise<ViewerBulkMutationResult | null>
    {
        const form = new FormData();
        form.set('kind', input.kind);
        form.set('value', String(input.value));
        form.set('videoIds', input.videoIds.join(','));
        form.set('selectionContextKey', input.selectionContextKey ?? '');
        form.set('selectedCount', String(input.selectedCount));
        form.set('spansMultiplePages', input.spansMultiplePages ? '1' : '0');

        const result = await this.postAction(this.bulkUpdateFlagsAction, form);
        return VideoMutationService.parseBulkMutationResult(result);
    }

    async restoreSelectionState(input: {
        requestedVideoIds: number[];
        undo: BulkActionUndoState;
        selectionContextKey: string | null;
    }): Promise<ViewerBulkMutationResult | null>
    {
        const form = new FormData();
        form.set('videoIds', input.requestedVideoIds.join(','));
        form.set('originalStates', JSON.stringify(input.undo.originalStates));
        form.set('selectionContextKey', input.selectionContextKey ?? '');

        const result = await this.postAction(this.restoreSelectionStateAction, form);
        return VideoMutationService.parseBulkMutationResult(result);
    }

    private async postAction(url: string, form: FormData): Promise<MutationActionResult>
    {
        const response = await fetch(url, {
            method: 'POST',
            body: form
        });

        return deserialize(await response.text()) as MutationActionResult;
    }

    private static parseBulkMutationResult(value: unknown): ViewerBulkMutationResult | null
    {
        if (!VideoMutationService.isRecord(value)) {
            return null;
        }

        const { type, data } = value;
        if (type !== 'success' || !VideoMutationService.isRecord(data)) {
            return null;
        }

        const { ok, outcome, message, succeededIds } = data;

        if (typeof ok !== 'boolean') {
            return null;
        }

        if (outcome !== 'full_success' && outcome !== 'partial_success' && outcome !== 'failed') {
            return null;
        }

        if (typeof message !== 'string') {
            return null;
        }

        if (!Array.isArray(succeededIds) || succeededIds.some((id) => typeof id !== 'number')) {
            return null;
        }

        return {
            ok,
            outcome,
            message,
            succeededIds
        };
    }

    private static isRecord(value: unknown): value is Record<string, unknown>
    {
        return typeof value === 'object' && value !== null;
    }
}
// apply-patch-anchor - do not delete
