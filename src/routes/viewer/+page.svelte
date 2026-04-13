<script lang="ts">
    import { browser } from '$app/environment';
    import { deserialize } from '$app/forms';
    import { goto } from '$app/navigation';
    import {
        applyBulkFlagToVisibleVideos,
        buildViewerSelectionUndoPayload,
        getBulkActionFeedbackTone,
        getNextBulkFlagValue,
        restoreVisibleVideoSnapshots,
        updateVisibleVideoFlag
    } from '$lib/viewer/bulkActions';
    import ViewerBulkActionBar from '$lib/viewer/components/ViewerBulkActionBar.svelte';
    import ViewerFilterPanel from '$lib/viewer/components/ViewerFilterPanel.svelte';
    import ViewerPagination from '$lib/viewer/components/ViewerPagination.svelte';
    import ViewerResultsGrid from '$lib/viewer/components/ViewerResultsGrid.svelte';
    import {
        buildViewerFilterQuery,
        buildViewerPageHref,
        createViewerSelectionSnapshots,
        deriveViewerFilterInputState,
        deriveViewerPaginationState,
        deriveViewerSelectionSummary,
        FILTER_DEBOUNCE_MS,
        findActiveViewerGroup
    } from '$lib/viewer/pageState';
    import {
        getViewerCardSelectionAction,
        shouldClearViewerSelectionFromBackground,
        shouldPreventViewerCardMouseDown
    } from '$lib/viewer/selectionInteractions';
    import type {
        BulkActionFeedback,
        ViewerPageData,
        ViewerVideo,
        ViewerVisiblePage
    } from '$lib/viewer/types';
    import { ViewerSelectionContext } from '$lib/viewer/selection/context';
    import { viewerSelectionStateManager } from '$lib/viewer/selection/core';
    import { viewerSelectionSessionStore } from '$lib/viewer/selection/persistence';
    import type {
        ViewerSelectionControlState,
        ViewerSelectionFlagKind,
        ViewerSelectionFlagValue,
        ViewerSelectionVideoSnapshot,
        ViewerSelectionState
    } from '$lib/viewer/selection/types';

    export let data: ViewerPageData;

    let f = data.filters;
    let activeVirtualChannel = findActiveViewerGroup(data.groups, f.groupId);
    const today = new Date().toISOString().slice(0, 10);
    let totalPages = 1;
    let currentPage = 1;
    let visiblePages: ViewerVisiblePage[] = [];
    let termInput = '';
    let dateFromInput = '';
    let dateToInput = '';
    let channelIdInput = '';
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

    function buildPageHref(page: number): string
    {
        return buildViewerPageHref(f, page);
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
        return buildViewerFilterQuery(f, {
            termInput,
            dateFromInput,
            dateToInput,
            channelIdInput,
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
        const action = getViewerCardSelectionAction(event, bulkActionPending);

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
        if (shouldPreventViewerCardMouseDown(event, bulkActionPending)) {
            event.preventDefault();
        }
    }

    function handleViewerBackgroundClick(event: MouseEvent)
    {
        if (!shouldClearViewerSelectionFromBackground(event, hasActiveSelection, bulkActionPending)) {
            return;
        }

        selectionState = viewerSelectionStateManager.clear(selectionState);
    }

    async function handleCardFlagToggle(videoId: number, kind: ViewerSelectionFlagKind, value: ViewerSelectionFlagValue)
    {
        if (bulkActionPending) {
            return;
        }

        const form = new FormData();
        form.set('videoId', String(videoId));
        form.set('kind', kind);
        form.set('value', String(value));

        const response = await fetch('?/toggleFlag', {
            method: 'POST',
            body: form
        });
        const result = deserialize(await response.text());

        if (result.type !== 'success' || !result.data) {
            return;
        }

        visibleVideos = updateVisibleVideoFlag(visibleVideos, videoId, kind, value);
    }

    async function handleBulkFlagToggle(kind: ViewerSelectionFlagKind, controlState: ViewerSelectionControlState)
    {
        if (bulkActionPending || selectionState.selectedVideoIds.length === 0) {
            return;
        }

        bulkActionPending = true;

        try {
            const nextValue = getNextBulkFlagValue(controlState);
            const form = new FormData();
            form.set('kind', kind);
            form.set('value', String(nextValue));
            form.set('videoIds', selectionState.selectedVideoIds.join(','));
            form.set('selectionContextKey', selectionState.contextKey);
            form.set('selectedCount', String(selectionState.selectedVideoIds.length));
            form.set('spansMultiplePages', offPageSelectedCount > 0 ? '1' : '0');

            const response = await fetch('?/bulkUpdateFlags', {
                method: 'POST',
                body: form
            });
            const result = deserialize(await response.text());
            const failureMessage = (result as any)?.data?.message || 'Bulk update failed.';

            if (result.type !== 'success' || !result.data) {
                bulkActionFeedback = {
                    message: failureMessage,
                    tone: 'error',
                    undo: null
                };
                return;
            }

            const actionResult = result.data as any;
            const succeededIds = Array.isArray(actionResult.succeededIds)
                ? actionResult.succeededIds as number[]
                : [];
            const undo = buildViewerSelectionUndoPayload(selectionState);

            bulkActionFeedback = {
                message: String(actionResult.message || failureMessage),
                tone: getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok),
                undo
            };

            selectionState = viewerSelectionStateManager.applyBulkFlag(selectionState, kind, nextValue, succeededIds);
            visibleVideos = applyBulkFlagToVisibleVideos(visibleVideos, kind, nextValue, succeededIds);
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
            const form = new FormData();
            form.set('videoIds', undo.requestedVideoIds.join(','));
            form.set('originalStates', JSON.stringify(undo.originalStates));
            form.set('selectionContextKey', selectionState.contextKey);

            const response = await fetch('?/restoreSelectionState', {
                method: 'POST',
                body: form
            });
            const result = deserialize(await response.text());
            const failureMessage = (result as any)?.data?.message || 'Bulk undo failed.';

            if (result.type !== 'success' || !result.data) {
                bulkActionFeedback = {
                    message: failureMessage,
                    tone: 'error',
                    undo
                };
                return;
            }

            const actionResult = result.data as any;
            const succeededIdSet = new Set(
                Array.isArray(actionResult.succeededIds)
                    ? actionResult.succeededIds as number[]
                    : []
            );
            const restoredStates = undo.originalStates.filter((state) => succeededIdSet.has(state.videoId));
            const restoredSnapshots = restoredStates.map((state) => ({
                id: state.videoId,
                watched: state.watched,
                favorite: state.favorite,
                ignored: state.ignored
            }));

            selectionState = viewerSelectionStateManager.restoreVideoStates(selectionState, restoredSnapshots);
            visibleVideos = restoreVisibleVideoSnapshots(visibleVideos, restoredSnapshots);

            bulkActionFeedback = {
                message: String(actionResult.message || failureMessage),
                tone: getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok),
                undo: actionResult.outcome === 'full_success' ? null : undo
            };
        } finally {
            bulkActionPending = false;
        }
    }

    $: f = data.filters;
    $: visibleVideos = data.videos;
    $: currentPageSelectionVideos = createViewerSelectionSnapshots(visibleVideos);
    $: ({ termInput, dateFromInput, dateToInput, channelIdInput, limitInput, watchedMode, showIgnored } =
        deriveViewerFilterInputState(f));
    $: activeVirtualChannel = findActiveViewerGroup(data.groups, f.groupId);
    $: ({ totalPages, currentPage, visiblePages } = deriveViewerPaginationState(f, data.totalCount));
    $: ({ hasActiveSelection, selectedCount, offPageSelectedCount, watchedControlState, favoriteControlState, ignoredControlState } =
        deriveViewerSelectionSummary(selectionState));
    $: {
        const nextContextKey = ViewerSelectionContext.createKey({
            profileKey: data.profileKey,
            term: f.term,
            watched: f.watched,
            ignored: f.ignored,
            dateFromInput: f.dateFromInput,
            dateToInput: f.dateToInput,
            channelId: f.channelId,
            groupId: f.groupId
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
        bind:limitInput
        bind:watchedMode
        bind:showIgnored
        onSubmit={handleFilterSubmit}
        onTermInput={scheduleApply}
        onTextKeydown={handleFilterKeydown}
        onDateCommit={handleImmediateFilterChange}
        onChannelChange={handleImmediateFilterChange}
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
        onCardMouseDown={handleCardMouseDown}
        onCardClick={handleCardClick}
        onToggleFlag={handleCardFlagToggle}
    />
</div>

<style>
    .viewer-page {
        gap: 0.5rem;
    }
</style>
