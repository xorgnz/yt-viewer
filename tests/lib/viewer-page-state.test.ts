import { describe, expect, it } from 'vitest';
import {
    viewerPageState
} from '../../src/lib/viewer/pageState';
import { ViewerSelectionContext } from '../../src/lib/viewer/selection/context';
import { viewerSelectionStateManager } from '../../src/lib/viewer/selection/core';
import type { ViewerFilters } from '../../src/lib/viewer/types';

describe('viewer page state helpers', () => {
    function createFilters(overrides: Partial<ViewerFilters> = {}): ViewerFilters
    {
        return {
            term: '',
            watched: 'all',
            ignored: 'hide',
            dateFrom: null,
            dateTo: null,
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: null,
            limit: 10,
            offset: 0,
            ...overrides
        };
    }

    it('builds filter query flags from input state', () => {
        const filters = createFilters({ groupId: 4 });
        const inputState = viewerPageState.deriveViewerFilterInputState({
            ...filters,
            term: 'space',
            watched: 'unwatched',
            ignored: 'show',
            dateFromInput: '2026-04-01',
            dateToInput: '2026-04-10',
            channelId: 22,
            limit: 25
        });

        const query = new URLSearchParams(viewerPageState.buildViewerFilterQuery(filters, inputState));

        expect(query.get('term')).toBe('space');
        expect(query.get('watched')).toBe('all');
        expect(query.get('unwatchedOnly')).toBe('1');
        expect(query.get('showIgnored')).toBe('1');
        expect(query.get('channelId')).toBe('22');
        expect(query.get('groupId')).toBe('4');
        expect(query.get('limit')).toBe('25');
        expect(query.get('offset')).toBe('0');
    });

    it('derives visible pagination state for large result sets', () => {
        const pagination = viewerPageState.deriveViewerPaginationState(createFilters({
            limit: 10,
            offset: 110
        }), 250);

        expect(pagination.totalPages).toBe(25);
        expect(pagination.currentPage).toBe(12);
        expect(pagination.visiblePages).toContain(12);
        expect(pagination.visiblePages[0]).toBe(1);
        expect(pagination.visiblePages[pagination.visiblePages.length - 1]).toBe(25);
    });

    it('derives selection summary from current and off-page selections', () => {
        const contextKey = ViewerSelectionContext.createKey({
            profileKey: 'default',
            term: '',
            watched: 'all',
            ignored: 'hide',
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: null
        });
        const pageOneVideos = [
            { id: 1, watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
            { id: 2, watched: 1 as const, favorite: 1 as const, ignored: 0 as const }
        ];
        const pageTwoVideos = [
            { id: 3, watched: 0 as const, favorite: 0 as const, ignored: 1 as const }
        ];

        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);
        state = viewerSelectionStateManager.toggle(state, 1);
        state = viewerSelectionStateManager.toggle(state, 2);
        state = viewerSelectionStateManager.reconcile(state, contextKey, pageTwoVideos);

        const summary = viewerPageState.deriveViewerSelectionSummary(state);

        expect(summary.hasActiveSelection).toBe(true);
        expect(summary.selectedCount).toBe(2);
        expect(summary.offPageSelectedCount).toBe(2);
        expect(summary.watchedControlState).toBe('mixed');
        expect(summary.favoriteControlState).toBe('mixed');
        expect(summary.ignoredControlState).toBe('unchecked');
    });
});
// apply-patch-anchor - do not delete