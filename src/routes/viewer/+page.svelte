<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import {
        viewerBulkActions
    } from '$lib/viewer/bulkActions';
    import ViewerBulkActionBar from '$lib/viewer/components/ViewerBulkActionBar.svelte';
    import ViewerFilterPanel from '$lib/viewer/components/ViewerFilterPanel.svelte';
    import ViewerPagination from '$lib/viewer/components/ViewerPagination.svelte';
    import ViewerResultsGrid from '$lib/viewer/components/ViewerResultsGrid.svelte';
    import {
        FILTER_DEBOUNCE_MS,
        viewerPageState
    } from '$lib/viewer/pageState';
    import { viewerSortSession } from '$lib/viewer/sortSession';
    import {
        viewerSelectionInteractions
    } from '$lib/viewer/selectionInteractions';
    import type {
        BulkActionFeedback,
        ViewerPageData,
        ViewerSort,
        ViewerVideo,
        ViewerVisiblePage
    } from '$lib/viewer/types';
    import { ViewerSelectionContext } from '$lib/viewer/selection/context';
    import { viewerSelectionStateManager } from '$lib/viewer/selection/core';
    import { viewerSelectionSessionStore } from '$lib/viewer/selection/persistence';
    import type {
        ViewerSelectionControlState,
        ViewerSelectionFlagKind,
        ViewerSelectionVideoSnapshot,
        ViewerSelectionState
    } from '$lib/viewer/selection/types';

    export let data: ViewerPageData;

    let f = data.filters;
    let activeVirtualChannel = viewerPageState.findActiveVirtualChannel(data.groups, f.groupId);
    let activeVirtualChannelIsCapped = false;
    const today = new Date().toISOString().slice(0, 10);
    let totalPages = 1;
    let currentPage = 1;
    let visiblePages: ViewerVisiblePage[] = [];
    let termInput = '';
    let dateFromInput = '';
    let dateToInput = '';
    let channelIdInput = '';
    let sortMode: ViewerSort = 'newest';
    let limitInput = '';
    let watchedMode: 'all' | 'watched' | 'unwatched' = 'all';
    let showIgnored = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let selectionState: ViewerSelectionState = viewerSelectionStateManager.create('', []);
    let hydratedSelectionContextKey: string | null = null;
    let hasActiveSelection = false;
    let selectedCount = 0;
    let offPageSelectedCount = 0;
    let visibleVideos: ViewerVideo[] = data.videos;
    let currentPageSelectionVideos: ViewerSelectionVideoSnapshot[] = [];
    let watchedControlState: ViewerSelectionControlState = 'unchecked';
    let favoriteControlState: ViewerSelectionControlState = 'unchecked';
    let ignoredControlState: ViewerSelectionControlState = 'unchecked';
    let bulkActionPending = false;
    let bulkActionFeedback: BulkActionFeedback | null = null;
    let sortPreferenceInitialized = false;
    const videoMutationService = new VideoMutationService();

    function buildPageHref(page: number): string
    {
        return viewerPageState.buildViewerPageHref(f, page);
    }

    function buildVideoWatchHref(video: ViewerVideo): string
    {
        return viewerPageState.buildViewerWatchHref(f, video.youtube_id);
    }

    function clearPendingApply()
    {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
    }

    function buildFilterQuery(): string
    {
        return viewerPageState.buildViewerFilterQuery(f, {
            termInput,
            dateFromInput,
            dateToInput,
            channelIdInput,
            sortMode,
            limitInput,
            watchedMode,
            showIgnored
        });
    }

    async function applyFiltersNow()
    {
        clearPendingApply();
        await goto(`?${buildFilterQuery()}`, {
            keepFocus: true,
            noScroll: true
        });
    }

    function scheduleApply()
    {
        clearPendingApply();
        debounceTimer = setTimeout(() => {
            void applyFiltersNow();
        }, FILTER_DEBOUNCE_MS);
    }

    function handleImmediateFilterChange()
    {
        void applyFiltersNow();
    }

    function handleSortChange()
    {
        void applyFiltersNow();
    }

    function handleFilterSubmit(event: SubmitEvent)
    {
        event.preventDefault();
        void applyFiltersNow();
    }

    function handleFilterKeydown(event: KeyboardEvent)
    {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        void applyFiltersNow();
    }

    function handleWatchedOnlyChange(event: Event)
    {
        const checked = (event.currentTarget as HTMLInputElement).checked;
        watchedMode = checked ? 'unwatched' : (watchedMode === 'unwatched' ? 'all' : watchedMode);
        void applyFiltersNow();
    }

    function handleCardClick(event: MouseEvent | KeyboardEvent, videoId: number)
    {
        const action = viewerSelectionInteractions.getViewerCardSelectionAction(event, bulkActionPending);

        if (action === 'none') {
            return;
        }

        event.preventDefault();

        if (action === 'toggle') {
            if (!(event instanceof KeyboardEvent)) {
                event.stopPropagation();
            }

            selectionState = viewerSelectionStateManager.toggle(selectionState, videoId);
            return;
        }

        if (action === 'selectRange') {
            event.stopPropagation();
            selectionState = viewerSelectionStateManager.selectRange(selectionState, videoId);
            return;
        }

        selectionState = viewerSelectionStateManager.toggleSingle(selectionState, videoId);
    }

    function handleCardMouseDown(event: MouseEvent)
    {
        if (viewerSelectionInteractions.shouldPreventViewerCardMouseDown(event, bulkActionPending)) {
            event.preventDefault();
        }
    }

    function handleViewerBackgroundClick(event: MouseEvent)
    {
        if (!viewerSelectionInteractions.shouldClearViewerSelectionFromBackground(event, hasActiveSelection, bulkActionPending)) {
            return;
        }

        selectionState = viewerSelectionStateManager.clear(selectionState);
    }

    function handleVisibleVideoChange(video: ViewerVideo)
    {
        visibleVideos = visibleVideos.map((item) => item.id === video.id ? video : item);
    }

    async function handleBulkFlagToggle(kind: ViewerSelectionFlagKind, controlState: ViewerSelectionControlState)
    {
        if (bulkActionPending || selectionState.selectedVideoIds.length === 0) {
            return;
        }

        bulkActionPending = true;

        try {
            const nextValue = viewerBulkActions.getNextBulkFlagValue(controlState);
            const actionResult = await videoMutationService.bulkUpdateFlags({
                kind,
                value: nextValue,
                videoIds: selectionState.selectedVideoIds,
                selectionContextKey: selectionState.contextKey,
                selectedCount: selectionState.selectedVideoIds.length,
                spansMultiplePages: offPageSelectedCount > 0
            });

            if (!actionResult) {
                bulkActionFeedback = {
                    message: 'Bulk update failed.',
                    tone: 'error',
                    undo: null
                };
                return;
            }

            const undo = viewerBulkActions.buildViewerSelectionUndoPayload(selectionState);

            bulkActionFeedback = {
                message: String(actionResult.message || 'Bulk update failed.'),
                tone: viewerBulkActions.getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok),
                undo
            };

            selectionState = viewerSelectionStateManager.applyBulkFlag(
                selectionState,
                kind,
                nextValue,
                actionResult.succeededIds
            );
            visibleVideos = viewerBulkActions.applyBulkFlagToVisibleVideos(
                visibleVideos,
                kind,
                nextValue,
                actionResult.succeededIds
            );
        } finally {
            bulkActionPending = false;
        }
    }

    async function handleBulkUndo()
    {
        if (bulkActionPending || !bulkActionFeedback?.undo) {
            return;
        }

        bulkActionPending = true;

        try {
            const undo = bulkActionFeedback.undo;
            const actionResult = await videoMutationService.restoreSelectionState({
                requestedVideoIds: undo.requestedVideoIds,
                undo,
                selectionContextKey: selectionState.contextKey
            });

            if (!actionResult) {
                bulkActionFeedback = {
                    message: 'Bulk undo failed.',
                    tone: 'error',
                    undo
                };
                return;
            }

            const succeededIdSet = new Set(actionResult.succeededIds);
            const restoredStates = undo.originalStates.filter((state) => succeededIdSet.has(state.videoId));
            const restoredSnapshots = restoredStates.map((state) => ({
                id: state.videoId,
                watched: state.watched,
                favorite: state.favorite,
                ignored: state.ignored
            }));

            selectionState = viewerSelectionStateManager.restoreVideoStates(selectionState, restoredSnapshots);
            visibleVideos = viewerBulkActions.restoreVisibleVideoSnapshots(visibleVideos, restoredSnapshots);

            bulkActionFeedback = {
                message: String(actionResult.message || 'Bulk undo failed.'),
                tone: viewerBulkActions.getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok),
                undo: actionResult.outcome === 'full_success' ? null : undo
            };
        } finally {
            bulkActionPending = false;
        }
    }

    $: f = data.filters;
    $: visibleVideos = data.videos;
    $: currentPageSelectionVideos = viewerPageState.createViewerSelectionSnapshots(visibleVideos);
    $: ({ termInput, dateFromInput, dateToInput, channelIdInput, sortMode, limitInput, watchedMode, showIgnored } =
        viewerPageState.deriveViewerFilterInputState(f));
    $: activeVirtualChannel = viewerPageState.findActiveVirtualChannel(data.groups, f.groupId);
    $: activeVirtualChannelIsCapped = activeVirtualChannel?.timerState === 'capped';
    $: ({ totalPages, currentPage, visiblePages } = viewerPageState.deriveViewerPaginationState(f, data.totalCount));
    $: ({ hasActiveSelection, selectedCount, offPageSelectedCount, watchedControlState, favoriteControlState, ignoredControlState } =
        viewerPageState.deriveViewerSelectionSummary(selectionState));
    $: {
        const nextContextKey = ViewerSelectionContext.createKey({
            profileKey: data.profileKey,
            term: f.term,
            watched: f.watched,
            ignored: f.ignored,
            dateFromInput: f.dateFromInput,
            dateToInput: f.dateToInput,
            channelId: f.channelId,
            groupId: f.groupId,
            sort: f.sort
        });
        const nextCurrentPageVideoIds = currentPageSelectionVideos.map((video) => video.id);
        const contextChanged = selectionState.contextKey !== nextContextKey;

        if (browser && selectionState.contextKey && contextChanged) {
            viewerSelectionSessionStore.clear(selectionState.contextKey);
            hydratedSelectionContextKey = nextContextKey;
        }

        if (
            contextChanged ||
            selectionState.currentPageVideoIds.join(',') !== nextCurrentPageVideoIds.join(',')
        ) {
            selectionState = viewerSelectionStateManager.reconcile(
                selectionState,
                nextContextKey,
                currentPageSelectionVideos
            );
        }
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey !== selectionState.contextKey) {
        const persistedSelectionState = viewerSelectionSessionStore.load(
            selectionState.contextKey,
            currentPageSelectionVideos
        );

        if (persistedSelectionState) {
            selectionState = persistedSelectionState;
        }

        hydratedSelectionContextKey = selectionState.contextKey;
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey === selectionState.contextKey) {
        viewerSelectionSessionStore.persist(selectionState);
    }

    $: if (!hasActiveSelection && bulkActionFeedback) {
        bulkActionFeedback = null;
    }

    onMount(() =>
    {
        const currentUrl = new URL(window.location.href);
        const hasSortParam = currentUrl.searchParams.has('sort');
        const storedSort = viewerSortSession.load();

        if (!hasSortParam && storedSort && storedSort !== f.sort) {
            sortMode = storedSort;
            void goto(`?${viewerPageState.buildViewerFilterQuery(f, {
                termInput,
                dateFromInput,
                dateToInput,
                channelIdInput,
                sortMode: storedSort,
                limitInput,
                watchedMode,
                showIgnored
            })}`, {
                replaceState: true,
                keepFocus: true,
                noScroll: true
            });
            return;
        }

        sortPreferenceInitialized = true;
    });

    $: if (browser && sortPreferenceInitialized) {
        viewerSortSession.persist(f.sort);
    }
</script>

<svelte:window on:click={handleViewerBackgroundClick} />

<div class="page stack viewer-page">
    <ViewerFilterPanel
        filters={f}
        channels={data.channels}
        activeVirtualChannelName={activeVirtualChannel?.name ?? null}
        {today}
        bind:termInput
        bind:dateFromInput
        bind:dateToInput
        bind:channelIdInput
        bind:sortMode
        bind:limitInput
        bind:watchedMode
        bind:showIgnored
        onSubmit={handleFilterSubmit}
        onTermInput={scheduleApply}
        onTextKeydown={handleFilterKeydown}
        onDateCommit={handleImmediateFilterChange}
        onChannelChange={handleImmediateFilterChange}
        onSortChange={handleSortChange}
        onLimitInput={scheduleApply}
        onWatchedOnlyChange={handleWatchedOnlyChange}
        onShowIgnoredChange={handleImmediateFilterChange}
    />

    <ViewerBulkActionBar
        {hasActiveSelection}
        {selectedCount}
        {offPageSelectedCount}
        {bulkActionPending}
        {bulkActionFeedback}
        {watchedControlState}
        {favoriteControlState}
        {ignoredControlState}
        onBulkUndo={handleBulkUndo}
        onBulkFlagToggle={handleBulkFlagToggle}
    />

    <ViewerPagination
        totalCount={data.totalCount}
        {totalPages}
        {currentPage}
        {visiblePages}
        {buildPageHref}
    />

    <ViewerResultsGrid
        videos={visibleVideos}
        selectedVideoIds={selectionState.selectedVideoIds}
        disabled={activeVirtualChannelIsCapped}
        {buildVideoWatchHref}
        {videoMutationService}
        onCardMouseDown={handleCardMouseDown}
        onCardClick={handleCardClick}
        onVideoChange={handleVisibleVideoChange}
    />

    <ViewerPagination
        totalCount={data.totalCount}
        {totalPages}
        {currentPage}
        {visiblePages}
        {buildPageHref}
    />
</div>

<style>
    .viewer-page {
        gap: 0.5rem;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
