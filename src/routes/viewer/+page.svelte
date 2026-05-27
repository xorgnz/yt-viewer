<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SourceChannel } from '$lib/entities/sourceChannel';
    import { Video } from '$lib/entities/video';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import {
        viewerBulkActions
    } from '$lib/viewer/bulkActions';
    import ViewerBulkActionBar from './ViewerBulkActionBar.svelte';
    import ViewerFilterPanel from './ViewerFilterPanel.svelte';
    import ViewerPagination from './ViewerPagination.svelte';
    import ViewerResultsGrid from './ViewerResultsGrid.svelte';
    import { ViewerSelectionControlState, viewerPageSelection } from '$lib/viewer/ViewerPageSelection';
    import { viewerSortSession } from '$lib/viewer/sortSession';
    import {
        viewerSelectionInteractions
    } from '$lib/viewer/selectionInteractions';
    import {
        BulkActionFeedbackTone,
    } from '$lib/viewer/BulkActionFeedback';
    import type { ViewerFilterInputState } from '$lib/viewer/ViewerFilters';
    import {
        ViewerVirtualChannelTimer,
        ViewerVirtualChannelTimerState,
    } from '$lib/viewer/ViewerVirtualChannelTimer';
    import type {
        BulkActionFeedback,
    } from '$lib/viewer/BulkActionFeedback';
    import {
        ViewerPageState,
        type ViewerPageStateFields,
        type ViewerVisiblePage
    } from '$lib/viewer/ViewerPageState';
    import { ViewerSelectionContext } from '$lib/viewer/selection/context';
    import { viewerSelectionStateManager } from '$lib/viewer/selection/core';
    import { viewerSelectionSessionStore } from '$lib/viewer/selection/persistence';
    import type {
        ViewerSelectionFlagKind,
        ViewerSelectionVideoSnapshot,
        ViewerSelectionState
    } from '$lib/viewer/selection/types';

    export let data: ViewerPageStateFields;

    let pageState = new ViewerPageState(data);

    let f = pageState.filters;
    let activeVirtualChannel = pageState.activeVirtualChannel == null
        ? null
        : ViewerVirtualChannelTimer.deserialize(pageState.activeVirtualChannel);
    let activeVirtualChannelIsCapped = false;
    const today = new Date().toISOString().slice(0, 10);
    let totalPages = 1;
    let currentPage = 1;
    let visiblePages: ViewerVisiblePage[] = [];
    let selectionState: ViewerSelectionState = viewerSelectionStateManager.create('', []);
    let hydratedSelectionContextKey: string | null = null;
    let hasActiveSelection = false;
    let selectedCount = 0;
    let offPageSelectedCount = 0;
    let visibleVideos: Video[] = pageState.videos.map((video) => new Video(video));
    let currentPageSelectionVideos: ViewerSelectionVideoSnapshot[] = [];
    let watchedControlState: ViewerSelectionControlState = ViewerSelectionControlState.Unchecked;
    let favoriteControlState: ViewerSelectionControlState = ViewerSelectionControlState.Unchecked;
    let ignoredControlState: ViewerSelectionControlState = ViewerSelectionControlState.Unchecked;
    let bulkActionPending = false;
    let bulkActionFeedback: BulkActionFeedback | null = null;
    let sortPreferenceInitialized = false;
    const videoMutationService = new VideoMutationService();
    let sourceChannels = pageState.channels.map((channel) => new SourceChannel(channel));

    function buildPageHref(page: number): string
    {
        return pageState.navigation.buildPageHref(page);
    }

    function buildVideoWatchHref(video: Video): string
    {
        return pageState.navigation.buildWatchHref(String(video.id));
    }

    function buildFilterQuery(inputState: ViewerFilterInputState): string
    {
        return pageState.navigation.buildFilterQuery(inputState);
    }

    async function handleApplyFilters(inputState: ViewerFilterInputState)
    {
        await goto(`?${buildFilterQuery(inputState)}`, {
            keepFocus: true,
            noScroll: true
        });
    }

    function handleCardClick(event: MouseEvent | KeyboardEvent, videoId: string | number)
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

    function handleVisibleVideoChange(video: Video)
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
                    tone: BulkActionFeedbackTone.Error,
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
                    tone: BulkActionFeedbackTone.Error,
                    undo
                };
                return;
            }

            const succeededIdSet = new Set(actionResult.succeededIds);
            const restoredStates = undo.originalStates.filter((state) => succeededIdSet.has(state.videoId));
            const restoredSnapshots = restoredStates.map((state) => ({
                id: String(state.videoId),
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

    $: pageState = new ViewerPageState(data);
    $: f = pageState.filters;
    $: visibleVideos = pageState.videos.map((video) => new Video(video));
    $: sourceChannels = pageState.channels.map((channel) => new SourceChannel(channel));
    $: currentPageSelectionVideos = viewerPageSelection.createSnapshots(visibleVideos);
    $: activeVirtualChannel = pageState.activeVirtualChannel == null
        ? null
        : ViewerVirtualChannelTimer.deserialize(pageState.activeVirtualChannel);
    $: activeVirtualChannelIsCapped = activeVirtualChannel?.timerState === ViewerVirtualChannelTimerState.Capped;
    $: ({ totalPages, currentPage, visiblePages } = pageState.derivePaginationState());
    $: ({ hasActiveSelection, selectedCount, offPageSelectedCount, watchedControlState, favoriteControlState, ignoredControlState } =
        viewerPageSelection.deriveSummary(selectionState));
    $: {
        const nextContextKey = ViewerSelectionContext.createKey({
            profileKey: pageState.profileKey,
            term: f.term,
            watched: f.watched,
            ignored: f.ignored,
            dateFromInput: f.dateFromInput,
            dateToInput: f.dateToInput,
            channelId: f.channelId != null ? String(f.channelId) : null,
            virtualChannelId: f.virtualChannelId != null ? String(f.virtualChannelId) : null,
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
            void goto(`?${pageState.navigation.buildFilterQuery({
                termInput: f.term || '',
                dateFromInput: f.dateFromInput,
                dateToInput: f.dateToInput,
                channelIdInput: f.channelId != null ? String(f.channelId) : '',
                sortMode: storedSort,
                limitInput: String(f.limit),
                watchedMode: f.watched,
                showIgnored: f.ignored !== 'hide'
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
        channels={sourceChannels}
        activeVirtualChannelName={activeVirtualChannel?.name ?? null}
        {today}
        onApplyFilters={handleApplyFilters}
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
        totalCount={pageState.totalCount}
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
        totalCount={pageState.totalCount}
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
