import type { BulkFlagKind } from '$lib/daos/flagsDAO';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import type {
    BulkFlagValue,
    BulkRestoreState,
    BulkUndoState
} from '$lib/server/viewer/ViewerFlagService';

export class ViewerActionParser
{
    static parseToggleFlag(form: ServerActionForm)
    {
        const videoId = form.getIdentifier('videoId');
        const kind = ViewerActionParser.parseBulkFlagKind(form.getRaw('kind'));
        const value = ViewerActionParser.parseBulkFlagValue(form.getRaw('value'));

        if (videoId === null || !kind || value === null) {
            return null;
        }

        return {
            videoId,
            kind,
            value
        };
    }

    static parseBulkUpdateFlags(form: ServerActionForm)
    {
        const kind = ViewerActionParser.parseBulkFlagKind(form.getRaw('kind'));
        const value = ViewerActionParser.parseBulkFlagValue(form.getRaw('value'));
        const requestedVideoIds = form.getIdentifierList({ csvField: 'videoIds' });
        const selectionContextKey = form.getNullableTrimmedString('selectionContextKey');
        const selectedCountHintRaw = form.getNumber('selectedCount', requestedVideoIds.length);
        const selectedCountHint = Number.isInteger(selectedCountHintRaw) && selectedCountHintRaw >= 0
            ? selectedCountHintRaw
            : requestedVideoIds.length;

        if (!kind || value === null || requestedVideoIds.length === 0) {
            return null;
        }

        return {
            kind,
            value,
            requestedVideoIds,
            selectedCountHint,
            selectionContextKey,
            spansMultiplePages: form.isEnabled('spansMultiplePages')
        };
    }

    static parseUndoBulkUpdateFlags(form: ServerActionForm)
    {
        const kind = ViewerActionParser.parseBulkFlagKind(form.getRaw('kind'));
        const requestedVideoIds = form.getIdentifierList({ csvField: 'videoIds' });
        const undoStates = ViewerActionParser.parseUndoStates(form.getRaw('originalStates'));
        const selectionContextKey = form.getNullableTrimmedString('selectionContextKey');

        if (!kind || undoStates === null) {
            return null;
        }

        return {
            kind,
            selectionContextKey,
            requestedVideoIds,
            undoStates
        };
    }

    static parseRestoreSelectionState(form: ServerActionForm)
    {
        const restoreStates = ViewerActionParser.parseRestoreStates(form.getRaw('originalStates'));

        if (restoreStates === null) {
            return null;
        }

        return {
            requestedVideoIds: form.getIdentifierList({ csvField: 'videoIds' }),
            restoreStates,
            selectionContextKey: form.getNullableTrimmedString('selectionContextKey')
        };
    }

    private static parseBulkFlagKind(raw: FormDataEntryValue | null): BulkFlagKind | null
    {
        const value = String(raw || '').trim();
        if (value === 'watched' || value === 'favorite' || value === 'ignored') {
            return value;
        }

        return null;
    }

    private static parseBulkFlagValue(raw: FormDataEntryValue | null): BulkFlagValue | null
    {
        const value = String(raw || '').trim();
        if (value === '1') return 1;
        if (value === '0') return 0;
        return null;
    }

    private static parseUndoStates(raw: FormDataEntryValue | null): BulkUndoState[] | null
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
                const videoId = String((item as any)?.videoId || '').trim();
                const value = Number((item as any)?.value);
                if (!videoId || (value !== 0 && value !== 1)) {
                    return null;
                }

                states.push({ videoId, value: value as BulkFlagValue });
            }

            return states;
        } catch {
            return null;
        }
    }

    private static parseRestoreStates(raw: FormDataEntryValue | null): BulkRestoreState[] | null
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
                const videoId = String((item as any)?.videoId || '').trim();
                const watched = Number((item as any)?.watched);
                const favorite = Number((item as any)?.favorite);
                const ignored = Number((item as any)?.ignored);

                if (
                    !videoId ||
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
}
// apply-patch-anchor - do not delete
