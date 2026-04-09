import { describe, expect, it } from 'vitest';
import {
    createViewerSelectionContextKey,
    createViewerSelectionState,
    reconcileViewerSelectionState,
    toggleViewerSelectionVideo
} from '../../src/lib/viewerSelection';

describe('viewerSelection filter-context behavior', () => {
    const pageOneVideos = [
        { id: 1, watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
        { id: 2, watched: 1 as const, favorite: 1 as const, ignored: 0 as const }
    ];
    const pageTwoVideos = [
        { id: 3, watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
        { id: 4, watched: 1 as const, favorite: 0 as const, ignored: 1 as const }
    ];

    function createContextKey(overrides: Partial<Parameters<typeof createViewerSelectionContextKey>[0]> = {})
    {
        return createViewerSelectionContextKey({
            profileKey: 'default',
            term: '',
            watched: 'all',
            ignored: 'hide',
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: null,
            ...overrides
        });
    }

    it('preserves selection when pagination changes inside the same filter context', () => {
        const contextKey = createContextKey();
        let state = createViewerSelectionState(contextKey, pageOneVideos);

        state = toggleViewerSelectionVideo(state, 1);
        state = toggleViewerSelectionVideo(state, 2);

        const nextState = reconcileViewerSelectionState(state, contextKey, pageTwoVideos);

        expect(nextState.selectedVideoIds).toEqual([1, 2]);
        expect(nextState.anchorVideoId).toBe(2);
        expect(nextState.currentPageVideoIds).toEqual([3, 4]);
        expect(nextState.selectedVideoState).toEqual({
            1: { watched: 0, favorite: 0, ignored: 0 },
            2: { watched: 1, favorite: 1, ignored: 0 }
        });
    });

    it('clears selection when the filter context changes', () => {
        const originalContextKey = createContextKey();
        let state = createViewerSelectionState(originalContextKey, pageOneVideos);

        state = toggleViewerSelectionVideo(state, 1);
        state = toggleViewerSelectionVideo(state, 2);

        const filteredContextKey = createContextKey({ watched: 'unwatched', term: 'music' });
        const nextState = reconcileViewerSelectionState(state, filteredContextKey, pageOneVideos);

        expect(nextState.contextKey).toBe(filteredContextKey);
        expect(nextState.selectedVideoIds).toEqual([]);
        expect(nextState.anchorVideoId).toBeNull();
        expect(nextState.selectedVideoState).toEqual({});
        expect(nextState.currentPageVideoIds).toEqual([1, 2]);
    });
});
