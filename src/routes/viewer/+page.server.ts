import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO, type BulkFlagKind } from '$lib/daos/flagsDAO';
import { fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import {
    ViewerFlagService,
    type BulkFlagValue,
    type BulkUndoState,
    type BulkRestoreState
} from '$lib/server/viewer/ViewerFlagService';
import { ViewerLoadService } from '$lib/server/viewer/ViewerLoadService';

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

export const load = async ({ url, cookies }: { url: URL; cookies: any }) =>
{
    return ServerDatabaseContext.run(({ db }) => {
        return new ViewerLoadService(db).load(url, cookies);
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
            const service = new ViewerFlagService(new VideoDAO(db), new FlagsDAO(db), profileContext.activeProfileId);

            return service.toggleFlag(videoId, kind, value);
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
            const service = new ViewerFlagService(new VideoDAO(db), new FlagsDAO(db), profileContext.activeProfileId);

            return service.bulkUpdateFlags({
                kind,
                value,
                requestedVideoIds,
                selectionContextKey,
                selectedCountHint,
                spansMultiplePages
            });
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
            const service = new ViewerFlagService(new VideoDAO(db), new FlagsDAO(db), profileContext.activeProfileId);

            return service.undoBulkUpdateFlags({
                kind,
                requestedVideoIds,
                undoStates,
                selectionContextKey
            });
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
            const service = new ViewerFlagService(new VideoDAO(db), new FlagsDAO(db), profileContext.activeProfileId);

            return service.restoreSelectionState({
                requestedVideoIds,
                restoreStates,
                selectionContextKey
            });
        });
    }
};
