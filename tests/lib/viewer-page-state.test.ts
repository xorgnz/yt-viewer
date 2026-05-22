import { describe, expect, it } from 'vitest';
import { ViewerPageNavigation } from '../../src/lib/viewer/ViewerPageNavigation';
import { viewerPageSelection } from '../../src/lib/viewer/ViewerPageSelection';
import { ViewerPageState } from '../../src/lib/viewer/ViewerPageState';
import { ViewerSelectionContext } from '../../src/lib/viewer/selection/context';
import { viewerSelectionStateManager } from '../../src/lib/viewer/selection/core';
import {
    ViewerIgnoredFilter,
    ViewerSort,
    ViewerWatchedFilter
} from '../../src/lib/viewer/ViewerFilters';
import type { ViewerFilters } from '../../src/lib/viewer/ViewerFilters';

describe('viewer page state helpers', () => {
    function createFilters(overrides: Partial<ViewerFilters> = {}): ViewerFilters
    {
        return {
            term: '',
            watched: ViewerWatchedFilter.All,
            ignored: ViewerIgnoredFilter.Hide,
            dateFrom: null,
            dateTo: null,
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            virtualChannelId: null,
            sort: ViewerSort.Newest,
            limit: 10,
            offset: 0,
            ...overrides
        };
    }

    it('builds filter query flags from input state', () => {
        const filters = createFilters({ virtualChannelId: '4' });
        const navigation = new ViewerPageNavigation({
            ...filters,
            term: 'space',
            watched: ViewerWatchedFilter.Unwatched,
            ignored: ViewerIgnoredFilter.Show,
            dateFromInput: '2026-04-01',
            dateToInput: '2026-04-10',
            channelId: '22',
            limit: 25
        });
        const inputState = navigation.deriveFilterInputState();

        const query = new URLSearchParams(new ViewerPageNavigation(filters).buildFilterQuery(inputState));

        expect(query.get('term')).toBe('space');
        expect(query.get('watched')).toBe('all');
        expect(query.get('unwatchedOnly')).toBe('1');
        expect(query.get('showIgnored')).toBe('1');
        expect(query.get('channelId')).toBe('22');
        expect(query.get('virtualChannelId')).toBe('4');
        expect(query.get('sort')).toBe('newest');
        expect(query.get('limit')).toBe('25');
        expect(query.get('offset')).toBe('0');
    });

    it('derives visible pagination state for large result sets', () => {
        const pagination = new ViewerPageState({
            filters: createFilters({
                limit: 10,
                offset: 110
            }),
            videos: [],
            totalCount: 250,
            channels: [],
            virtualChannels: [],
            activeVirtualChannel: null,
            profileId: 'default',
            profileKey: 'default',
            profileName: 'Default'
        }).derivePaginationState();

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
            watched: ViewerWatchedFilter.All,
            ignored: ViewerIgnoredFilter.Hide,
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            virtualChannelId: null,
            sort: ViewerSort.Newest
        });
        const pageOneVideos = [
            { id: '1', watched: 0 as const, favorite: 0 as const, ignored: 0 as const },
            { id: '2', watched: 1 as const, favorite: 1 as const, ignored: 0 as const }
        ];
        const pageTwoVideos = [
            { id: '3', watched: 0 as const, favorite: 0 as const, ignored: 1 as const }
        ];

        let state = viewerSelectionStateManager.create(contextKey, pageOneVideos);
        state = viewerSelectionStateManager.toggle(state, '1');
        state = viewerSelectionStateManager.toggle(state, '2');
        state = viewerSelectionStateManager.reconcile(state, contextKey, pageTwoVideos);

        const summary = viewerPageSelection.deriveSummary(state);

        expect(summary.hasActiveSelection).toBe(true);
        expect(summary.selectedCount).toBe(2);
        expect(summary.offPageSelectedCount).toBe(2);
        expect(summary.watchedControlState).toBe('mixed');
        expect(summary.favoriteControlState).toBe('mixed');
        expect(summary.ignoredControlState).toBe('unchecked');
    });

    it('builds watch hrefs with the current viewer filters and sort', () => {
        const href = new ViewerPageNavigation(createFilters({
            term: 'ramen',
            watched: ViewerWatchedFilter.Unwatched,
            ignored: ViewerIgnoredFilter.Show,
            channelId: '7',
            virtualChannelId: '3',
            sort: ViewerSort.TitleDesc
        })).buildWatchHref('abc123');

        const url = new URL(`http://localhost${href}`);

        expect(url.pathname).toBe('/viewer/watch/abc123');
        expect(url.searchParams.get('term')).toBe('ramen');
        expect(url.searchParams.get('watched')).toBe('unwatched');
        expect(url.searchParams.get('ignored')).toBe('show');
        expect(url.searchParams.get('channelId')).toBe('7');
        expect(url.searchParams.get('virtualChannelId')).toBe('3');
        expect(url.searchParams.get('sort')).toBe('title_desc');
    });
});
// apply-patch-anchor - do not delete
