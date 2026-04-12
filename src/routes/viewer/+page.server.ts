import { VideoDAO } from '$lib/daos/videoDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO, type BulkFlagKind } from '$lib/daos/flagsDAO';
import { fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';

function parseDateOnly(value: string | null, boundary: 'start' | 'end'): number | null
{
    if (!value) {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (boundary === 'start') {
        return new Date(year, month, day, 0, 0, 0, 0).getTime();
    }

    return new Date(year, month, day, 23, 59, 59, 999).getTime();
}

type BulkFlagValue = 0 | 1;

type BulkUndoState = {
    videoId: number;
    value: BulkFlagValue;
};

type BulkRestoreState = {
    videoId: number;
    watched: BulkFlagValue;
    favorite: BulkFlagValue;
    ignored: BulkFlagValue;
};

function parseBulkFlagKind(raw: FormDataEntryValue | null): BulkFlagKind | null
{
    const value = String(raw || '').trim();
    if (value === 'watched' || value === 'favorite' || value === 'ignored') {
        return value;
    }

    return null;
}

function parseBulkFlagValue(raw: FormDataEntryValue | null): BulkFlagValue | null
{
    const value = String(raw || '').trim();
    if (value === '1') return 1;
    if (value === '0') return 0;
    return null;
}

function parseUndoStates(raw: FormDataEntryValue | null): BulkUndoState[] | null
{
    const text = String(raw || '').trim();
    if (!text) {
        return [];
    }

    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            return null;
        }

        const states: BulkUndoState[] = [];
        for (const item of parsed) {
            const videoId = Number((item as any)?.videoId);
            const value = Number((item as any)?.value);
            if (!Number.isInteger(videoId) || videoId <= 0 || (value !== 0 && value !== 1)) {
                return null;
            }
            states.push({ videoId, value: value as BulkFlagValue });
        }

        return states;
    } catch {
        return null;
    }
}

function parseRestoreStates(raw: FormDataEntryValue | null): BulkRestoreState[] | null
{
    const text = String(raw || '').trim();
    if (!text) {
        return [];
    }

    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            return null;
        }

        const states: BulkRestoreState[] = [];
        for (const item of parsed) {
            const videoId = Number((item as any)?.videoId);
            const watched = Number((item as any)?.watched);
            const favorite = Number((item as any)?.favorite);
            const ignored = Number((item as any)?.ignored);

            if (
                !Number.isInteger(videoId) ||
                videoId <= 0 ||
                (watched !== 0 && watched !== 1) ||
                (favorite !== 0 && favorite !== 1) ||
                (ignored !== 0 && ignored !== 1)
            ) {
                return null;
            }

            states.push({
                videoId,
                watched: watched as BulkFlagValue,
                favorite: favorite as BulkFlagValue,
                ignored: ignored as BulkFlagValue
            });
        }

        return states;
    } catch {
        return null;
    }
}

function describeBulkAction(flag: BulkFlagKind, value: BulkFlagValue): string
{
    if (flag === 'ignored') {
        return value === 1 ? 'marked ignored' : 'cleared ignored';
    }
    if (flag === 'favorite') {
        return value === 1 ? 'marked favorite' : 'cleared favorite';
    }
    return value === 1 ? 'marked watched' : 'cleared watched';
}

function formatBulkMessage(succeededCount: number, failedCount: number, skippedCount: number, actionText: string): string
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

function getOutcome(succeededCount: number, failedCount: number, skippedCount: number): 'full_success' | 'partial_success' | 'failed'
{
    if (succeededCount === 0) {
        return 'failed';
    }

    if (failedCount === 0 && skippedCount === 0) {
        return 'full_success';
    }

    return 'partial_success';
}

export const load = async ({ url, cookies }: { url: URL; cookies: any }) =>
{
    const term = url.searchParams.get('term') || undefined;
    const watchedParamRaw = url.searchParams.get('watched');
    const unwatchedOnly = url.searchParams.get('unwatchedOnly');
    const showIgnored = url.searchParams.get('showIgnored');
    const ignoredParam = showIgnored === '1' ? 'show' : (url.searchParams.get('ignored') || 'hide');
    const ignored = (ignoredParam === 'show') ? 'show' : 'hide';
    const dateFromInput = url.searchParams.get('dateFrom')?.trim() || '';
    const dateToInput = url.searchParams.get('dateTo')?.trim() || '';
    const channelId = url.searchParams.get('channelId');
    const groupId = url.searchParams.get('groupId');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    return ServerDatabaseContext.run(({ db }) => {
        // Resolve the site-wide active profile before loading profile-scoped viewer state.
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);
        const watchedParam = unwatchedOnly === '1'
            ? 'unwatched'
            : (watchedParamRaw ?? (profileContext.activeProfileKey === 'child' ? 'unwatched' : 'all'));
        const watched = (watchedParam === 'watched' || watchedParam === 'unwatched') ? watchedParam : 'all';
        const filters = {
            term,
            watched: watched as 'all' | 'watched' | 'unwatched',
            ignored: ignored as 'hide' | 'show',
            dateFrom: parseDateOnly(dateFromInput, 'start'),
            dateTo: parseDateOnly(dateToInput, 'end'),
            dateFromInput,
            dateToInput,
            channelId: channelId ? Number(channelId) : null,
            groupId: groupId ? Number(groupId) : null,
            limit: limit ? Number(limit) : 200,
            offset: offset ? Number(offset) : 0
        } as const;

        const vDao = new VideoDAO(db);
        const cDao = new SourceChannelDAO(db);
        const gDao = new VirtualChannelDAO(db);

        const [videos, totalCount, channels, groups] = [
            vDao.listForViewer(filters as any, profileContext.activeProfileId),
            vDao.countForViewer(filters as any, profileContext.activeProfileId),
            cDao.list(),
            gDao.list()
        ];

        return {
            filters,
            videos,
            totalCount,
            channels,
            groups,
            profileId: profileContext.activeProfileId,
            profileKey: profileContext.activeProfileKey,
            profileName: profileContext.activeProfileName
        };
    });
};

export const actions = {
    async toggleFlag({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const videoId = form.getPositiveInteger('videoId');
        const kind = parseBulkFlagKind(form.getRaw('kind'));
        const value = parseBulkFlagValue(form.getRaw('value'));

        if (
            videoId === null ||
            !kind ||
            value === null
        ) {
            return fail(400, { message: 'Invalid toggle parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const flags = new FlagsDAO(db);
            if (kind === 'watched') {
                flags.set(videoId, profileContext.activeProfileId, { watched: value });
            } else if (kind === 'favorite') {
                flags.set(videoId, profileContext.activeProfileId, { favorite: value });
            } else if (kind === 'ignored') {
                flags.set(videoId, profileContext.activeProfileId, { ignored: value });
            }
            return {
                ok: true,
                videoId,
                kind,
                value
            };
        });
    },

    async bulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const kind = parseBulkFlagKind(form.getRaw('kind'));
        const value = parseBulkFlagValue(form.getRaw('value'));
        const requestedVideoIds = form.getPositiveIntegerList({ csvField: 'videoIds' });
        const selectionContextKey = form.getNullableTrimmedString('selectionContextKey');
        const selectedCountHintRaw = form.getNumber('selectedCount', requestedVideoIds.length);
        const selectedCountHint = Number.isInteger(selectedCountHintRaw) && selectedCountHintRaw >= 0
            ? selectedCountHintRaw
            : requestedVideoIds.length;
        const spansMultiplePages = form.isEnabled('spansMultiplePages');

        if (!kind || value === null || requestedVideoIds.length === 0) {
            return fail(400, { message: 'Invalid bulk flag parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const videos = new VideoDAO(db);
            const flags = new FlagsDAO(db);
            const existingIds = videos.listExistingIds(requestedVideoIds);
            const existingIdSet = new Set(existingIds);
            const failedIds = requestedVideoIds.filter((videoId) => !existingIdSet.has(videoId));
            const originalValueMap = flags.getValueMap(existingIds, profileContext.activeProfileId, kind);
            const undoStates = existingIds.map((videoId) => ({
                videoId,
                value: originalValueMap.get(videoId) ?? 0
            }));

            flags.setManyValue(existingIds, profileContext.activeProfileId, kind, value);

            const actionText = describeBulkAction(kind, value);
            const succeededIds = [...existingIds];
            const skippedIds: number[] = [];
            const message = formatBulkMessage(succeededIds.length, failedIds.length, skippedIds.length, actionText);

            return {
                ok: succeededIds.length > 0,
                outcome: getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
                kind,
                value,
                selectionContextKey,
                selectedCount: selectedCountHint,
                spansMultiplePages,
                requestedCount: requestedVideoIds.length,
                attemptedCount: existingIds.length,
                succeededCount: succeededIds.length,
                failedCount: failedIds.length,
                skippedCount: skippedIds.length,
                succeededIds,
                failedIds,
                skippedIds,
                message,
                undo: {
                    kind,
                    value,
                    requestedVideoIds,
                    originalStates: undoStates
                }
            };
        });
    },

    async undoBulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const kind = parseBulkFlagKind(form.getRaw('kind'));
        const requestedVideoIds = form.getPositiveIntegerList({ csvField: 'videoIds' });
        const undoStates = parseUndoStates(form.getRaw('originalStates'));
        const selectionContextKey = form.getNullableTrimmedString('selectionContextKey');

        if (!kind || undoStates === null) {
            return fail(400, { message: 'Invalid bulk undo parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const videos = new VideoDAO(db);
            const flags = new FlagsDAO(db);
            const existingIds = videos.listExistingIds(requestedVideoIds);
            const existingIdSet = new Set(existingIds);
            const requestedUndoIds = requestedVideoIds.length > 0
                ? requestedVideoIds
                : undoStates.map((state) => state.videoId);
            const undoStateMap = new Map<number, BulkFlagValue>();
            for (const state of undoStates) {
                undoStateMap.set(state.videoId, state.value);
            }

            const applicableStates = requestedUndoIds
                .filter((videoId) => existingIdSet.has(videoId) && undoStateMap.has(videoId))
                .map((videoId) => ({ videoId, value: undoStateMap.get(videoId)! }));
            const succeededIds = applicableStates.map((state) => state.videoId);
            const failedIds = requestedUndoIds.filter((videoId) => !existingIdSet.has(videoId));
            const skippedIds = requestedUndoIds.filter((videoId) => existingIdSet.has(videoId) && !undoStateMap.has(videoId));

            flags.setManyValues(applicableStates, profileContext.activeProfileId, kind);

            const message = formatBulkMessage(
                succeededIds.length,
                failedIds.length,
                skippedIds.length,
                'restored'
            );

            return {
                ok: succeededIds.length > 0,
                outcome: getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
                kind,
                selectionContextKey,
                selectedCount: requestedUndoIds.length,
                requestedCount: requestedUndoIds.length,
                attemptedCount: applicableStates.length,
                succeededCount: succeededIds.length,
                failedCount: failedIds.length,
                skippedCount: skippedIds.length,
                succeededIds,
                failedIds,
                skippedIds,
                message
            };
        });
    },

    async restoreSelectionState({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const requestedVideoIds = form.getPositiveIntegerList({ csvField: 'videoIds' });
        const restoreStates = parseRestoreStates(form.getRaw('originalStates'));
        const selectionContextKey = form.getNullableTrimmedString('selectionContextKey');

        if (restoreStates === null) {
            return fail(400, { message: 'Invalid restore parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const videos = new VideoDAO(db);
            const flags = new FlagsDAO(db);
            const existingIds = videos.listExistingIds(requestedVideoIds);
            const existingIdSet = new Set(existingIds);
            const requestedRestoreIds = requestedVideoIds.length > 0
                ? requestedVideoIds
                : restoreStates.map((state) => state.videoId);
            const restoreStateMap = new Map<number, BulkRestoreState>();
            for (const state of restoreStates) {
                restoreStateMap.set(state.videoId, state);
            }

            const applicableStates = requestedRestoreIds
                .filter((videoId) => existingIdSet.has(videoId) && restoreStateMap.has(videoId))
                .map((videoId) => restoreStateMap.get(videoId)!);
            const succeededIds = applicableStates.map((state) => state.videoId);
            const failedIds = requestedRestoreIds.filter((videoId) => !existingIdSet.has(videoId));
            const skippedIds = requestedRestoreIds.filter((videoId) => existingIdSet.has(videoId) && !restoreStateMap.has(videoId));

            flags.setMany(applicableStates, profileContext.activeProfileId);

            const message = formatBulkMessage(
                succeededIds.length,
                failedIds.length,
                skippedIds.length,
                'restored'
            );

            return {
                ok: succeededIds.length > 0,
                outcome: getOutcome(succeededIds.length, failedIds.length, skippedIds.length),
                selectionContextKey,
                selectedCount: requestedRestoreIds.length,
                requestedCount: requestedRestoreIds.length,
                attemptedCount: applicableStates.length,
                succeededCount: succeededIds.length,
                failedCount: failedIds.length,
                skippedCount: skippedIds.length,
                succeededIds,
                failedIds,
                skippedIds,
                message
            };
        });
    }
};
