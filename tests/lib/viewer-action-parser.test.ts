import { describe, expect, it } from 'vitest';
import { ServerActionForm } from '../../src/lib/server/ServerActionForm';
import { ViewerActionParser } from '../../src/lib/server/viewer/ViewerActionParser';

describe('ViewerActionParser', () => {
    it('parses valid single-toggle requests', () => {
        const formData = new FormData();
        formData.set('videoId', '12');
        formData.set('kind', 'favorite');
        formData.set('value', '1');

        const parsed = ViewerActionParser.parseToggleFlag(new ServerActionForm(formData));

        expect(parsed).toEqual({
            videoId: 12,
            kind: 'favorite',
            value: 1
        });
    });

    it('parses bulk update inputs with selection metadata', () => {
        const formData = new FormData();
        formData.set('kind', 'watched');
        formData.set('value', '0');
        formData.set('videoIds', '1,2,2,3');
        formData.set('selectedCount', '5');
        formData.set('spansMultiplePages', '1');
        formData.set('selectionContextKey', 'profile=default');

        const parsed = ViewerActionParser.parseBulkUpdateFlags(new ServerActionForm(formData));

        expect(parsed).toEqual({
            kind: 'watched',
            value: 0,
            requestedVideoIds: [1, 2, 3],
            selectionContextKey: 'profile=default',
            selectedCountHint: 5,
            spansMultiplePages: true
        });
    });

    it('parses undo and restore payloads and rejects invalid JSON payloads', () => {
        const undoFormData = new FormData();
        undoFormData.set('kind', 'ignored');
        undoFormData.set('videoIds', '4,5');
        undoFormData.set('originalStates', JSON.stringify([
            { videoId: 4, value: 1 },
            { videoId: 5, value: 0 }
        ]));

        const restoreFormData = new FormData();
        restoreFormData.set('videoIds', '9');
        restoreFormData.set('originalStates', JSON.stringify([
            { videoId: 9, watched: 1, favorite: 0, ignored: 1 }
        ]));

        const invalidRestoreFormData = new FormData();
        invalidRestoreFormData.set('originalStates', '{bad json');

        expect(ViewerActionParser.parseUndoBulkUpdateFlags(new ServerActionForm(undoFormData))).toEqual({
            kind: 'ignored',
            requestedVideoIds: [4, 5],
            undoStates: [
                { videoId: 4, value: 1 },
                { videoId: 5, value: 0 }
            ],
            selectionContextKey: null
        });
        expect(ViewerActionParser.parseRestoreSelectionState(new ServerActionForm(restoreFormData))).toEqual({
            requestedVideoIds: [9],
            restoreStates: [
                { videoId: 9, watched: 1, favorite: 0, ignored: 1 }
            ],
            selectionContextKey: null
        });
        expect(ViewerActionParser.parseRestoreSelectionState(new ServerActionForm(invalidRestoreFormData))).toBeNull();
    });
});
