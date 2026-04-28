import { describe, expect, it } from 'vitest';
import { ViewerSelectionContext } from '../../src/lib/viewer/selection/context';
import { viewerSelectionStateManager } from '../../src/lib/viewer/selection/core';
import { viewerSelectionSessionStore } from '../../src/lib/viewer/selection/persistence';
import { viewerSelectionInspector } from '../../src/lib/viewer/selection/summary';
import type { ViewerSelectionContextInput } from '../../src/lib/viewer/selection/types';

describe('viewerSelection filter-context behavior', () => {
    const pageOneVideos = [
        { id: 1, watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
        { id: 2, watched: 1 as const, favorite: 1 as const, ignored: 0 as const }
    ];
    const pageTwoVideos = [
        { id: 3, watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
        { id: 4, watched: 1 as const, favorite: 0 as const, ignored: 1 as const }
    ];

    function createContextKey(overrides: Partial<ViewerSelectionContextInput> = {})
    {
        return ViewerSelectionContext.createKey({
            profileKey: 'default',
            term: '',
            watched: 'all',
            ignored: 'hide',
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: null,
            sort: 'newest',
            ...overrides
        });
    }

    it('preserves selection when pagination changes inside the same filter context', () => {
        const contextKey = createContextKey();
        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);

        const nextState = viewerSelectionStateManager.reconcile(state, contextKey, pageTwoVideos);

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
        let state = viewerSelectionStateManager.create(originalContextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);

        const filteredContextKey = createContextKey({ watched: 'unwatched', term: 'music' });
        const nextState = viewerSelectionStateManager.reconcile(state, filteredContextKey, pageOneVideos);

        expect(nextState.contextKey).toBe(filteredContextKey);
        expect(nextState.selectedVideoIds).toEqual([]);
        expect(nextState.anchorVideoId).toBeNull();
        expect(nextState.selectedVideoState).toEqual({});
        expect(nextState.currentPageVideoIds).toEqual([1, 2]);
    });

    it('clears selected ids, anchor, and stored flag state without changing the page context', () => {
        const contextKey = createContextKey();
        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);

        const clearedState = viewerSelectionStateManager.clear(state);

        expect(clearedState.contextKey).toBe(contextKey);
        expect(clearedState.currentPageVideoIds).toEqual([1, 2]);
        expect(clearedState.selectedVideoIds).toEqual([]);
        expect(clearedState.anchorVideoId).toBeNull();
        expect(clearedState.selectedVideoState).toEqual({});
    });

    it('replaces the selection with a single selected card for plain-click behavior', () => {
        const contextKey = createContextKey();
        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);
        state = viewerSelectionStateManager.selectSingle(state, 1);

        expect(state.selectedVideoIds).toEqual([1]);
        expect(state.anchorVideoId).toBe(1);
        expect(state.selectedVideoState).toEqual({
            1: { watched: 0, favorite: 0, ignored: 0 }
        });
    });

    it('clears the selection when the already-selected single card is plain-clicked again', () => {
        const contextKey = createContextKey();
        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggleSingle(state, 1);
        state = viewerSelectionStateManager.toggleSingle(state, 1);

        expect(state.selectedVideoIds).toEqual([]);
        expect(state.anchorVideoId).toBeNull();
        expect(state.selectedVideoState).toEqual({});
    });

    it('reports mixed control state and off-page selection through the inspector', () => {
        const contextKey = createContextKey();
        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);
        state = viewerSelectionStateManager.reconcile(state, contextKey, pageTwoVideos);

        expect(viewerSelectionInspector.hasSelectionOutsideCurrentPage(state)).toBe(true);
        expect(viewerSelectionInspector.getCurrentPageSelectedIds(state)).toEqual([]);
        expect(viewerSelectionInspector.getControlState(state, 'watched')).toBe('mixed');
    });

    it('persists and restores selection state through the session store', () => {
        const storage = new Map<string, string>();
        const originalWindow = globalThis.window;

        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: {
                sessionStorage: {
                    getItem(key: string) {
                        return storage.get(key) ?? null;
                    },
                    setItem(key: string, value: string) {
                        storage.set(key, value);
                    },
                    removeItem(key: string) {
                        storage.delete(key);
                    }
                }
            }
        });

        try {
            const contextKey = createContextKey();
            let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);

            state = viewerSelectionStateManager.toggle(state, 1);
            viewerSelectionSessionStore.persist(state);

            const restoredState = viewerSelectionSessionStore.load(contextKey, pageOneVideos);

            expect(restoredState?.selectedVideoIds).toEqual([1]);
            expect(restoredState?.anchorVideoId).toBe(1);
            expect(restoredState?.selectedVideoState).toEqual({
                1: { watched: 0, favorite: 0, ignored: 0 }
            });
        } finally {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: originalWindow
            });
        }
    });
});
// apply-patch-anchor - do not delete
