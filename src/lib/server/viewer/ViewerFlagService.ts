import type { BulkFlagKind } from '$lib/daos/flagsDAO';

export type BulkFlagValue = 0 | 1;

export type BulkUndoState = {
    videoId: string | number;
    value: BulkFlagValue;
};

export type BulkRestoreState = {
    videoId: string | number;
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
    succeededIds: Array<string | number>;
    failedIds: Array<string | number>;
    skippedIds: Array<string | number>;
    message: string;
};

export type ViewerBulkUpdateResult = ViewerBulkOperationResult & {
    kind: BulkFlagKind;
    value: BulkFlagValue;
    spansMultiplePages: boolean;
    undo: {
        kind: BulkFlagKind;
        value: BulkFlagValue;
        requestedVideoIds: Array<string | number>;
        originalStates: BulkUndoState[];
    };
};

export type ViewerBulkUndoResult = ViewerBulkOperationResult & {
    kind: BulkFlagKind;
};

type ViewerFlagVideoDAO = {
    listExistingIds(ids: Array<string | number>): Array<string | number> | Promise<Array<string | number>>;
};

type ViewerFlagFlagsDAO = {
    set(video_id: string | number, profile_id: string | number, patch: Partial<{ ignored: 0 | 1; watched: 0 | 1; favorite: 0 | 1 }>): void | Promise<void>;
    getValueMap(videoIds: Array<string | number>, profileId: string | number, kind: BulkFlagKind): Map<string, 0 | 1> | Promise<Map<string, 0 | 1>>;
    setManyValue(videoIds: Array<string | number>, profileId: string | number, kind: BulkFlagKind, value: 0 | 1): void | Promise<void>;
    setManyValues(entries: Array<{ videoId: string | number; value: 0 | 1 }>, profileId: string | number, kind: BulkFlagKind): void | Promise<void>;
    setMany(entries: Array<{ videoId: string | number; watched: 0 | 1; favorite: 0 | 1; ignored: 0 | 1 }>, profileId: string | number): void | Promise<void>;
};

type ViewerBulkUpdateInput = {
    kind: BulkFlagKind;
    value: BulkFlagValue;
    requestedVideoIds: Array<string | number>;
    selectionContextKey: string | null;
    selectedCountHint: number;
    spansMultiplePages: boolean;
};

type ViewerBulkUndoInput = {
    kind: BulkFlagKind;
    requestedVideoIds: Array<string | number>;
    undoStates: BulkUndoState[];
    selectionContextKey: string | null;
};

type ViewerRestoreSelectionInput = {
    requestedVideoIds: Array<string | number>;
    restoreStates: BulkRestoreState[];
    selectionContextKey: string | null;
};

export class ViewerFlagService
{
    private readonly videoDAO: ViewerFlagVideoDAO;
    private readonly flagsDAO: ViewerFlagFlagsDAO;
    private readonly profileId: string | number;

    constructor(videoDAO: ViewerFlagVideoDAO, flagsDAO: ViewerFlagFlagsDAO, profileId: string | number)
    {
        this.videoDAO = videoDAO;
        this.flagsDAO = flagsDAO;
        this.profileId = profileId;
    }

    async toggleFlag(videoId: string | number, kind: BulkFlagKind, value: BulkFlagValue): Promise<{
        ok: true;
        videoId: string | number;
        kind: BulkFlagKind;
        value: BulkFlagValue;
    }>
    {
        if (kind === 'watched') {
            await this.flagsDAO.set(videoId, this.profileId, { watched: value });
        } else if (kind === 'favorite') {
            await this.flagsDAO.set(videoId, this.profileId, { favorite: value });
        } else {
            await this.flagsDAO.set(videoId, this.profileId, { ignored: value });
        }

        return {
            ok: true,
            videoId,
            kind,
            value
        };
    }

    async bulkUpdateFlags(input: ViewerBulkUpdateInput): Promise<ViewerBulkUpdateResult>
    {
        const existingIds = await this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds.map((videoId) => String(videoId)));
        const failedIds = input.requestedVideoIds.filter((videoId) => !existingIdSet.has(String(videoId)));
        const originalValueMap = await this.flagsDAO.getValueMap(existingIds, this.profileId, input.kind);
        const undoStates = existingIds.map((videoId) => ({
            videoId,
            value: originalValueMap.get(String(videoId)) ?? 0
        }));

        await this.flagsDAO.setManyValue(existingIds, this.profileId, input.kind, input.value);

        const succeededIds = [...existingIds];
        const skippedIds: Array<string | number> = [];

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

    async undoBulkUpdateFlags(input: ViewerBulkUndoInput): Promise<ViewerBulkUndoResult>
    {
        const existingIds = await this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds.map((videoId) => String(videoId)));
        const requestedUndoIds = input.requestedVideoIds.length > 0
            ? input.requestedVideoIds
            : input.undoStates.map((state) => state.videoId);
        const undoStateMap = new Map<string, BulkFlagValue>();

        for (const state of input.undoStates) {
            undoStateMap.set(String(state.videoId), state.value);
        }

        const applicableStates = requestedUndoIds
            .filter((videoId) => existingIdSet.has(String(videoId)) && undoStateMap.has(String(videoId)))
            .map((videoId) => ({ videoId, value: undoStateMap.get(String(videoId))! }));
        const succeededIds = applicableStates.map((state) => state.videoId);
        const failedIds = requestedUndoIds.filter((videoId) => !existingIdSet.has(String(videoId)));
        const skippedIds = requestedUndoIds.filter((videoId) => existingIdSet.has(String(videoId)) && !undoStateMap.has(String(videoId)));

        await this.flagsDAO.setManyValues(applicableStates, this.profileId, input.kind);

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

    async restoreSelectionState(input: ViewerRestoreSelectionInput): Promise<ViewerBulkOperationResult>
    {
        const existingIds = await this.videoDAO.listExistingIds(input.requestedVideoIds);
        const existingIdSet = new Set(existingIds.map((videoId) => String(videoId)));
        const requestedRestoreIds = input.requestedVideoIds.length > 0
            ? input.requestedVideoIds
            : input.restoreStates.map((state) => state.videoId);
        const restoreStateMap = new Map<string, BulkRestoreState>();

        for (const state of input.restoreStates) {
            restoreStateMap.set(String(state.videoId), state);
        }

        const applicableStates = requestedRestoreIds
            .filter((videoId) => existingIdSet.has(String(videoId)) && restoreStateMap.has(String(videoId)))
            .map((videoId) => restoreStateMap.get(String(videoId))!);
        const succeededIds = applicableStates.map((state) => state.videoId);
        const failedIds = requestedRestoreIds.filter((videoId) => !existingIdSet.has(String(videoId)));
        const skippedIds = requestedRestoreIds.filter((videoId) => existingIdSet.has(String(videoId)) && !restoreStateMap.has(String(videoId)));

        await this.flagsDAO.setMany(applicableStates, this.profileId);

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
// apply-patch-anchor - do not delete
