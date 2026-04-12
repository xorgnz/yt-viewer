import { VideoDAO } from '$lib/daos/videoDAO';
import { FlagsDAO, type BulkFlagKind } from '$lib/daos/flagsDAO';

export type BulkFlagValue = 0 | 1;

export type BulkUndoState = {
    videoId: number;
    value: BulkFlagValue;
};

export type BulkRestoreState = {
    videoId: number;
    watched: BulkFlagValue;
    favorite: BulkFlagValue;
    ignored: BulkFlagValue;
};

export type ViewerBulkOperationResult = {
    ok: boolean;
    outcome: 'full_success' | 'partial_success' | 'failed';
    selectionContextKey: string | null;
    selectedCount: number;
    requestedCount: number;
    attemptedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
    succeededIds: number[];
    failedIds: number[];
    skippedIds: number[];
    message: string;
};

export type ViewerBulkUpdateResult = ViewerBulkOperationResult & {
    kind: BulkFlagKind;
    value: BulkFlagValue;
    spansMultiplePages: boolean;
    undo: {
        kind: BulkFlagKind;
        value: BulkFlagValue;
        requestedVideoIds: number[];
        originalStates: BulkUndoState[];
    };
};

export type ViewerBulkUndoResult = ViewerBulkOperationResult & {
    kind: BulkFlagKind;
};

type ViewerBulkUpdateInput = {
    kind: BulkFlagKind;
    value: BulkFlagValue;
    requestedVideoIds: number[];
    selectionContextKey: string | null;
    selectedCountHint: number;
    spansMultiplePages: boolean;
};

type ViewerBulkUndoInput = {
    kind: BulkFlagKind;
    requestedVideoIds: number[];
    undoStates: BulkUndoState[];
    selectionContextKey: string | null;
};

type ViewerRestoreSelectionInput = {
    requestedVideoIds: number[];
    restoreStates: BulkRestoreState[];
    selectionContextKey: string | null;
};

export class ViewerFlagService
{
    private readonly videoDAO: VideoDAO;
    private readonly flagsDAO: FlagsDAO;
    private readonly profileId: number;

    constructor(videoDAO: VideoDAO, flagsDAO: FlagsDAO, profileId: number)
    {
        this.videoDAO = videoDAO;
        this.flagsDAO = flagsDAO;
        this.profileId = profileId;
    }

    toggleFlag(videoId: number, kind: BulkFlagKind, value: BulkFlagValue)
    {
        if (kind === 'watched') {
            this.flagsDAO.set(videoId, this.profileId, { watched: value });
        } else if (kind === 'favorite') {
            this.flagsDAO.set(videoId, this.profileId, { favorite: value });
        } else {
            this.flagsDAO.set(videoId, this.profileId, { ignored: value });
        }

        return {
            ok: true,
            videoId,
            kind,
            value
        };
    }

    bulkUpdateFlags(input: ViewerBulkUpdateInput): ViewerBulkUpdateResult
    {
        const existingIds = this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds);
        const failedIds = input.requestedVideoIds.filter((videoId) => !existingIdSet.has(videoId));
        const originalValueMap = this.flagsDAO.getValueMap(existingIds, this.profileId, input.kind);
        const undoStates = existingIds.map((videoId) => ({
            videoId,
            value: originalValueMap.get(videoId) ?? 0
        }));

        this.flagsDAO.setManyValue(existingIds, this.profileId, input.kind, input.value);

        const succeededIds = [...existingIds];
        const skippedIds: number[] = [];

        return {
            ok: succeededIds.length > 0,
            outcome: ViewerFlagService.getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
            kind: input.kind,
            value: input.value,
            selectionContextKey: input.selectionContextKey,
            selectedCount: input.selectedCountHint,
            spansMultiplePages: input.spansMultiplePages,
            requestedCount: input.requestedVideoIds.length,
            attemptedCount: existingIds.length,
            succeededCount: succeededIds.length,
            failedCount: failedIds.length,
            skippedCount: skippedIds.length,
            succeededIds,
            failedIds,
            skippedIds,
            message: ViewerFlagService.formatBulkMessage(
                succeededIds.length,
                failedIds.length,
                skippedIds.length,
                ViewerFlagService.describeBulkAction(input.kind, input.value)
            ),
            undo: {
                kind: input.kind,
                value: input.value,
                requestedVideoIds: input.requestedVideoIds,
                originalStates: undoStates
            }
        };
    }

    undoBulkUpdateFlags(input: ViewerBulkUndoInput): ViewerBulkUndoResult
    {
        const existingIds = this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds);
        const requestedUndoIds = input.requestedVideoIds.length > 0
            ? input.requestedVideoIds
            : input.undoStates.map((state) => state.videoId);
        const undoStateMap = new Map<number, BulkFlagValue>();

        for (const state of input.undoStates) {
            undoStateMap.set(state.videoId, state.value);
        }

        const applicableStates = requestedUndoIds
            .filter((videoId) => existingIdSet.has(videoId) && undoStateMap.has(videoId))
            .map((videoId) => ({ videoId, value: undoStateMap.get(videoId)! }));
        const succeededIds = applicableStates.map((state) => state.videoId);
        const failedIds = requestedUndoIds.filter((videoId) => !existingIdSet.has(videoId));
        const skippedIds = requestedUndoIds.filter((videoId) => existingIdSet.has(videoId) && !undoStateMap.has(videoId));

        this.flagsDAO.setManyValues(applicableStates, this.profileId, input.kind);

        return {
            ok: succeededIds.length > 0,
            outcome: ViewerFlagService.getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
            kind: input.kind,
            selectionContextKey: input.selectionContextKey,
            selectedCount: requestedUndoIds.length,
            requestedCount: requestedUndoIds.length,
            attemptedCount: applicableStates.length,
            succeededCount: succeededIds.length,
            failedCount: failedIds.length,
            skippedCount: skippedIds.length,
            succeededIds,
            failedIds,
            skippedIds,
            message: ViewerFlagService.formatBulkMessage(
                succeededIds.length,
                failedIds.length,
                skippedIds.length,
                'restored'
            )
        };
    }

    restoreSelectionState(input: ViewerRestoreSelectionInput): ViewerBulkOperationResult
    {
        const existingIds = this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds);
        const requestedRestoreIds = input.requestedVideoIds.length > 0
            ? input.requestedVideoIds
            : input.restoreStates.map((state) => state.videoId);
        const restoreStateMap = new Map<number, BulkRestoreState>();

        for (const state of input.restoreStates) {
            restoreStateMap.set(state.videoId, state);
        }

        const applicableStates = requestedRestoreIds
            .filter((videoId) => existingIdSet.has(videoId) && restoreStateMap.has(videoId))
            .map((videoId) => restoreStateMap.get(videoId)!);
        const succeededIds = applicableStates.map((state) => state.videoId);
        const failedIds = requestedRestoreIds.filter((videoId) => !existingIdSet.has(videoId));
        const skippedIds = requestedRestoreIds.filter((videoId) => existingIdSet.has(videoId) && !restoreStateMap.has(videoId));

        this.flagsDAO.setMany(applicableStates, this.profileId);

        return {
            ok: succeededIds.length > 0,
            outcome: ViewerFlagService.getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
            selectionContextKey: input.selectionContextKey,
            selectedCount: requestedRestoreIds.length,
            requestedCount: requestedRestoreIds.length,
            attemptedCount: applicableStates.length,
            succeededCount: succeededIds.length,
            failedCount: failedIds.length,
            skippedCount: skippedIds.length,
            succeededIds,
            failedIds,
            skippedIds,
            message: ViewerFlagService.formatBulkMessage(
                succeededIds.length,
                failedIds.length,
                skippedIds.length,
                'restored'
            )
        };
    }

    private static describeBulkAction(flag: BulkFlagKind, value: BulkFlagValue): string
    {
        if (flag === 'ignored') {
            return value === 1 ? 'marked ignored' : 'cleared ignored';
        }

        if (flag === 'favorite') {
            return value === 1 ? 'marked favorite' : 'cleared favorite';
        }

        return value === 1 ? 'marked watched' : 'cleared watched';
    }

    private static formatBulkMessage(succeededCount: number, failedCount: number, skippedCount: number, actionText: string): string
    {
        const noun = succeededCount === 1 ? 'video' : 'videos';
        if (succeededCount > 0 && failedCount === 0 && skippedCount === 0) {
            return `${succeededCount} ${noun} ${actionText}.`;
        }

        const segments: string[] = [];
        if (succeededCount > 0) {
            segments.push(`${succeededCount} ${noun} ${actionText}`);
        }
        if (failedCount > 0) {
            segments.push(`${failedCount} failed`);
        }
        if (skippedCount > 0) {
            segments.push(`${skippedCount} skipped`);
        }

        return `${segments.join(', ')}.`;
    }

    private static getOutcome(succeededCount: number, failedCount: number, skippedCount: number): 'full_success' | 'partial_success' | 'failed'
    {
        if (succeededCount === 0) {
            return 'failed';
        }

        if (failedCount === 0 && skippedCount === 0) {
            return 'full_success';
        }

        return 'partial_success';
    }
}
