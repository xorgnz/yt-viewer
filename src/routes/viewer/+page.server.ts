import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO, type BulkFlagKind } from '$lib/daos/flagsDAO';
import { fail, redirect } from '@sveltejs/kit';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

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

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
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

function parseVideoIds(raw: FormDataEntryValue | null): number[]
{
    const text = String(raw || '').trim();
    if (!text) {
        return [];
    }

    const values = text.split(',').map((part) => Number(part.trim())).filter((value) => Number.isInteger(value) && value > 0);
    return Array.from(new Set(values));
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
    const profileKey = getActiveProfileKey(cookies);
    const watchedParamRaw = url.searchParams.get('watched');
    const unwatchedOnly = url.searchParams.get('unwatchedOnly');
    const watchedParam = unwatchedOnly === '1'
        ? 'unwatched'
        : (watchedParamRaw ?? (profileKey === 'child' ? 'unwatched' : 'all'));
    const watched = (watchedParam === 'watched' || watchedParam === 'unwatched') ? watchedParam : 'all';
    const showIgnored = url.searchParams.get('showIgnored');
    const ignoredParam = showIgnored === '1' ? 'show' : (url.searchParams.get('ignored') || 'hide');
    const ignored = (ignoredParam === 'show') ? 'show' : 'hide';
    const dateFromInput = url.searchParams.get('dateFrom')?.trim() || '';
    const dateToInput = url.searchParams.get('dateTo')?.trim() || '';
    const channelId = url.searchParams.get('channelId');
    const groupId = url.searchParams.get('groupId');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

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

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Resolve the site-wide active profile before loading profile-scoped viewer state.
        const pDao = new ProfileDAO(db);
        ensureProfiles(pDao);
        const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
        const profileId = profile!.id;

        const vDao = new VideoDAO(db);
        const cDao = new SourceChannelDAO(db);
        const gDao = new VirtualChannelDAO(db);

        const [videos, totalCount, channels, groups] = [
            vDao.listForViewer(filters as any, profileId),
            vDao.countForViewer(filters as any, profileId),
            cDao.list(),
            gDao.list()
        ];

        return {
            filters,
            videos,
            totalCount,
            channels,
            groups,
            profileId,
            profileKey,
            profileName: profile!.name
        };
    } finally {
        dbw.close();
    }
};

export const actions = {
    async toggleFlag({ request, url, cookies }: { request: Request; url: URL; cookies: any })
    {
        const form = await request.formData();
        const videoIdStr = String(form.get('videoId') || '').trim();
        const kind = String(form.get('kind') || '').trim(); // 'favorite' | 'ignored'
        const valueStr = String(form.get('value') || '').trim(); // '0' | '1'
        const profileKey = getActiveProfileKey(cookies);

        const videoId = Number(videoIdStr);
        const value = valueStr === '1' ? 1 : (valueStr === '0' ? 0 : NaN);

        if (!videoId || Number.isNaN(videoId) || (kind !== 'favorite' && kind !== 'ignored') || Number.isNaN(value)) {
            return fail(400, { message: 'Invalid toggle parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            ensureProfiles(pDao);
            const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
            const profileId = profile!.id;

            const flags = new FlagsDAO(db);
            if (kind === 'favorite') {
                flags.set(videoId, profileId, { favorite: value as 0 | 1 });
            } else if (kind === 'ignored') {
                flags.set(videoId, profileId, { ignored: value as 0 | 1 });
            }
        } finally {
            dbw.close();
        }

        // Stay on the same page with same query params
        throw redirect(303, `/viewer?${url.searchParams.toString()}`);
    },

    async bulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await request.formData();
        const kind = parseBulkFlagKind(form.get('kind'));
        const value = parseBulkFlagValue(form.get('value'));
        const requestedVideoIds = parseVideoIds(form.get('videoIds'));
        const selectionContextKey = String(form.get('selectionContextKey') || '').trim() || null;
        const selectedCountHintRaw = Number(form.get('selectedCount') || requestedVideoIds.length);
        const selectedCountHint = Number.isInteger(selectedCountHintRaw) && selectedCountHintRaw >= 0
            ? selectedCountHintRaw
            : requestedVideoIds.length;
        const spansMultiplePages = String(form.get('spansMultiplePages') || '').trim() === '1';
        const profileKey = getActiveProfileKey(cookies);

        if (!kind || value === null || requestedVideoIds.length === 0) {
            return fail(400, { message: 'Invalid bulk flag parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            ensureProfiles(pDao);
            const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
            const profileId = profile!.id;

            const videos = new VideoDAO(db);
            const flags = new FlagsDAO(db);
            const existingIds = videos.listExistingIds(requestedVideoIds);
            const existingIdSet = new Set(existingIds);
            const failedIds = requestedVideoIds.filter((videoId) => !existingIdSet.has(videoId));
            const originalValueMap = flags.getValueMap(existingIds, profileId, kind);
            const undoStates = existingIds.map((videoId) => ({
                videoId,
                value: originalValueMap.get(videoId) ?? 0
            }));

            flags.setManyValue(existingIds, profileId, kind, value);

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
        } finally {
            dbw.close();
        }
    },

    async undoBulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await request.formData();
        const kind = parseBulkFlagKind(form.get('kind'));
        const requestedVideoIds = parseVideoIds(form.get('videoIds'));
        const undoStates = parseUndoStates(form.get('originalStates'));
        const selectionContextKey = String(form.get('selectionContextKey') || '').trim() || null;
        const profileKey = getActiveProfileKey(cookies);

        if (!kind || undoStates === null) {
            return fail(400, { message: 'Invalid bulk undo parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            ensureProfiles(pDao);
            const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
            const profileId = profile!.id;

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

            flags.setManyValues(applicableStates, profileId, kind);

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
        } finally {
            dbw.close();
        }
    },

    async restoreSelectionState({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await request.formData();
        const requestedVideoIds = parseVideoIds(form.get('videoIds'));
        const restoreStates = parseRestoreStates(form.get('originalStates'));
        const selectionContextKey = String(form.get('selectionContextKey') || '').trim() || null;
        const profileKey = getActiveProfileKey(cookies);

        if (restoreStates === null) {
            return fail(400, { message: 'Invalid restore parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            ensureProfiles(pDao);
            const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
            const profileId = profile!.id;

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

            flags.setMany(applicableStates, profileId);

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
        } finally {
            dbw.close();
        }
    }
};
