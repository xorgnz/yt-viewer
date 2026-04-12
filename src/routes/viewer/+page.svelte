<script lang="ts">
    import { browser } from '$app/environment';
    import { deserialize } from '$app/forms';
    import { goto } from '$app/navigation';
    import ViewerBulkActionBar from '$lib/viewer/components/ViewerBulkActionBar.svelte';
    import ViewerFilterPanel from '$lib/viewer/components/ViewerFilterPanel.svelte';
    import ViewerPagination from '$lib/viewer/components/ViewerPagination.svelte';
    import ViewerResultsGrid from '$lib/viewer/components/ViewerResultsGrid.svelte';
    import type {
        BulkActionFeedback,
        ViewerPageData,
        ViewerVideo,
        ViewerVisiblePage
    } from '$lib/viewer/types';
    import {
        applyViewerSelectionBulkFlag,
        clearViewerSelectionState,
        clearPersistedViewerSelectionState,
        createViewerSelectionContextKey,
        createViewerSelectionState,
        getCurrentPageSelectedVideoIds,
        getViewerSelectionControlState,
        hasSelectionOutsideCurrentPage,
        loadPersistedViewerSelectionState,
        persistViewerSelectionState,
        reconcileViewerSelectionState,
        restoreViewerSelectionVideoStates,
        selectViewerSelectionRange,
        toggleSingleViewerSelectionVideo,
        toggleViewerSelectionVideo,
        type ViewerSelectionControlState,
        type ViewerSelectionFlagKind,
        type ViewerSelectionFlagValue,
        type ViewerSelectionVideoSnapshot,
        type ViewerSelectionState
    } from '$lib/viewerSelection';

    export let data: ViewerPageData;

    const FILTER_DEBOUNCE_MS = 450;

    let f = data.filters;
    let activeVirtualChannel = data.groups.find((group) => group.id === f.groupId) ?? null;
    const today = new Date().toISOString().slice(0, 10);
    let totalPages = Math.max(1, Math.ceil(data.totalCount / f.limit));
    let currentPage = Math.min(totalPages, Math.floor(f.offset / f.limit) + 1);
    let termInput = f.term || '';
    let dateFromInput = f.dateFromInput;
    let dateToInput = f.dateToInput;
    let channelIdInput = f.channelId != null ? String(f.channelId) : '';
    let limitInput = String(f.limit);
    let watchedMode: 'all' | 'watched' | 'unwatched' = f.watched;
    let showIgnored = f.ignored === 'show';
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let selectionState: ViewerSelectionState = createViewerSelectionState('', []);
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
        return `?${new URLSearchParams({
            term: f.term || '',
            watched: f.watched,
            ignored: f.ignored,
            dateFrom: f.dateFromInput,
            dateTo: f.dateToInput,
            channelId: f.channelId != null ? String(f.channelId) : '',
            groupId: f.groupId != null ? String(f.groupId) : '',
            limit: String(f.limit),
            offset: String((page - 1) * f.limit)
        }).toString()}`;
    }

    function getVisiblePages(current: number, total: number): ViewerVisiblePage[]
    {
        if (total <= 11) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }

        const windowSize = 9;
        const halfWindow = Math.floor(windowSize / 2);
        let start = Math.max(2, current - halfWindow);
        let end = Math.min(total - 1, current + halfWindow);

        if ((end - start + 1) < windowSize) {
            if (start === 2) {
                end = Math.min(total - 1, start + windowSize - 1);
            } else if (end === total - 1) {
                start = Math.max(2, end - windowSize + 1);
            }
        }

        const pages: ViewerVisiblePage[] = [1];

        if (start > 2) {
            pages.push('ellipsis');
        }

        for (let page = start; page <= end; page += 1) {
            pages.push(page);
        }

        if (end < total - 1) {
            pages.push('ellipsis');
        }

        pages.push(total);
        return pages;
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
        const params = new URLSearchParams({
            term: termInput,
            watched: watchedMode === 'watched' ? 'watched' : 'all',
            ignored: showIgnored ? 'show' : 'hide',
            dateFrom: dateFromInput,
            dateTo: dateToInput,
            channelId: channelIdInput,
            groupId: f.groupId != null ? String(f.groupId) : '',
            limit: limitInput,
            offset: '0'
        });

        if (watchedMode === 'unwatched') {
            params.set('unwatchedOnly', '1');
        }

        if (showIgnored) {
            params.set('showIgnored', '1');
        }

        return params.toString();
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
        if (bulkActionPending) {
            return;
        }

        if (event instanceof KeyboardEvent) {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            selectionState = toggleViewerSelectionVideo(selectionState, videoId);
            return;
        }

        if (event.defaultPrevented) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest('a, button, form')) {
            return;
        }

        if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            selectionState = selectViewerSelectionRange(selectionState, videoId);
            return;
        }

        if (!event.ctrlKey && !event.metaKey) {
            selectionState = toggleSingleViewerSelectionVideo(selectionState, videoId);
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectionState = toggleViewerSelectionVideo(selectionState, videoId);
    }

    function handleCardMouseDown(event: MouseEvent)
    {
        if (bulkActionPending) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest('a, button, form')) {
            return;
        }

        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            event.preventDefault();
        }
    }

    function handleViewerBackgroundClick(event: MouseEvent)
    {
        if (
            bulkActionPending ||
            !hasActiveSelection ||
            event.defaultPrevented ||
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey
        ) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (!target) {
            return;
        }

        if (target.closest('.card, .bulk-action-bar, .pager, .panel')) {
            return;
        }

        selectionState = clearViewerSelectionState(selectionState);
    }

    function getNextBulkFlagValue(controlState: ViewerSelectionControlState): ViewerSelectionFlagValue
    {
        return controlState === 'checked' ? 0 : 1;
    }

    function getBulkActionFeedbackTone(outcome: unknown, ok: unknown): 'success' | 'warning' | 'error'
    {
        if (outcome === 'partial_success') {
            return 'warning';
        }

        if (ok === true || outcome === 'full_success') {
            return 'success';
        }

        return 'error';
    }

    function buildSelectionBaselineUndoPayload(): BulkActionFeedback['undo']
    {
        const requestedVideoIds = [...selectionState.selectedVideoIds];
        const originalStates = requestedVideoIds
            .map((videoId) => {
                const baselineState = selectionState.baselineSelectedVideoState[videoId];
                if (!baselineState) {
                    return null;
                }

                return {
                    videoId,
                    watched: baselineState.watched,
                    favorite: baselineState.favorite,
                    ignored: baselineState.ignored
                };
            })
            .filter((state): state is NonNullable<typeof state> => !!state);

        if (requestedVideoIds.length === 0 || originalStates.length === 0) {
            return null;
        }

        return {
            requestedVideoIds,
            originalStates
        };
    }

    function applyVisibleVideoBulkFlag(
        kind: ViewerSelectionFlagKind,
        value: ViewerSelectionFlagValue,
        updatedVideoIds: number[]
    )
    {
        const updatedIdSet = new Set(updatedVideoIds);
        if (updatedIdSet.size === 0) {
            return;
        }

        visibleVideos = visibleVideos.map((video) => {
            if (!updatedIdSet.has(video.id)) {
                return video;
            }

            return {
                ...video,
                [kind]: value
            };
        });
    }

    function restoreVisibleVideoStates(restoredStates: ViewerSelectionVideoSnapshot[])
    {
        const restoredStateMap = new Map<number, Omit<ViewerSelectionVideoSnapshot, 'id'>>();
        for (const restoredState of restoredStates) {
            restoredStateMap.set(restoredState.id, {
                watched: restoredState.watched,
                favorite: restoredState.favorite,
                ignored: restoredState.ignored
            });
        }

        if (restoredStateMap.size === 0) {
            return;
        }

        visibleVideos = visibleVideos.map((video) => {
            if (!restoredStateMap.has(video.id)) {
                return video;
            }

            return {
                ...video,
                ...restoredStateMap.get(video.id)!
            };
        });
    }

    function updateVisibleVideoFlag(videoId: number, kind: ViewerSelectionFlagKind, value: ViewerSelectionFlagValue)
    {
        visibleVideos = visibleVideos.map((video) => {
            if (video.id !== videoId) {
                return video;
            }

            return {
                ...video,
                [kind]: value
            };
        });
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

        updateVisibleVideoFlag(videoId, kind, value);
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
            const feedbackTone = getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok);
            const undo = buildSelectionBaselineUndoPayload();

            bulkActionFeedback = {
                message: String(actionResult.message || failureMessage),
                tone: feedbackTone,
                undo
            };

            selectionState = applyViewerSelectionBulkFlag(selectionState, kind, nextValue, succeededIds);
            applyVisibleVideoBulkFlag(kind, nextValue, succeededIds);
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

            selectionState = restoreViewerSelectionVideoStates(selectionState, restoredSnapshots);
            restoreVisibleVideoStates(restoredSnapshots);

            bulkActionFeedback = {
                message: String(actionResult.message || failureMessage),
                tone: getBulkActionFeedbackTone(actionResult.outcome, actionResult.ok),
                undo: actionResult.outcome === 'full_success' ? null : undo
            };
        } finally {
            bulkActionPending = false;
        }
    }

    let visiblePages: ViewerVisiblePage[] = getVisiblePages(currentPage, totalPages);

    $: f = data.filters;
    $: visibleVideos = data.videos;
    $: currentPageSelectionVideos = visibleVideos.map((video) => ({
        id: video.id,
        watched: video.watched ? 1 : 0,
        favorite: video.favorite ? 1 : 0,
        ignored: video.ignored ? 1 : 0
    }));
    $: termInput = f.term || '';
    $: dateFromInput = f.dateFromInput;
    $: dateToInput = f.dateToInput;
    $: channelIdInput = f.channelId != null ? String(f.channelId) : '';
    $: limitInput = String(f.limit);
    $: watchedMode = f.watched;
    $: showIgnored = f.ignored === 'show';
    $: activeVirtualChannel = data.groups.find((group) => group.id === f.groupId) ?? null;
    $: totalPages = Math.max(1, Math.ceil(data.totalCount / f.limit));
    $: currentPage = Math.min(totalPages, Math.floor(f.offset / f.limit) + 1);
    $: visiblePages = getVisiblePages(currentPage, totalPages);
    $: hasActiveSelection = selectionState.selectedVideoIds.length > 0;
    $: selectedCount = selectionState.selectedVideoIds.length;
    $: offPageSelectedCount = hasSelectionOutsideCurrentPage(selectionState)
        ? selectedCount - getCurrentPageSelectedVideoIds(selectionState).length
        : 0;
    $: watchedControlState = getViewerSelectionControlState(selectionState, 'watched');
    $: favoriteControlState = getViewerSelectionControlState(selectionState, 'favorite');
    $: ignoredControlState = getViewerSelectionControlState(selectionState, 'ignored');
    $: {
        const nextContextKey = createViewerSelectionContextKey({
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
            clearPersistedViewerSelectionState(selectionState.contextKey);
            hydratedSelectionContextKey = nextContextKey;
        }

        if (
            contextChanged ||
            selectionState.currentPageVideoIds.join(',') !== nextCurrentPageVideoIds.join(',')
        ) {
            selectionState = reconcileViewerSelectionState(selectionState, nextContextKey, currentPageSelectionVideos);
        }
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey !== selectionState.contextKey) {
        const persistedSelectionState = loadPersistedViewerSelectionState(
            selectionState.contextKey,
            currentPageSelectionVideos
        );

        if (persistedSelectionState) {
            selectionState = persistedSelectionState;
        }

        hydratedSelectionContextKey = selectionState.contextKey;
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey === selectionState.contextKey) {
        persistViewerSelectionState(selectionState);
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
