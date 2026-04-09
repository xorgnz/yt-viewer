<script lang="ts">
    import { browser } from '$app/environment';
    import { deserialize } from '$app/forms';
    import { goto } from '$app/navigation';
    import DatePicker from '$lib/components/DatePicker.svelte';
    import VideoCard from '$lib/components/VideoCard.svelte';
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

    export let data: {
        filters: {
            term?: string;
            watched: 'all' | 'watched' | 'unwatched';
            ignored: 'hide' | 'show';
            dateFrom: number | null;
            dateTo: number | null;
            dateFromInput: string;
            dateToInput: string;
            channelId: number | null;
            groupId: number | null;
            limit: number;
            offset: number;
        };
        videos: Array<{
            id: number;
            youtube_id: string;
            channel_id: number;
            title: string;
            description: string;
            published_at: number | null;
            duration_seconds: number | null;
            thumbnail_url: string | null;
            channel_title: string;
            channel_youtube_id: string;
            watched: number;
            favorite: number;
            ignored: number;
        }>;
        totalCount: number;
        channels: Array<{ id: number; youtube_id: string; title: string }>;
        groups: Array<{ id: number; name: string }>;
        profileId: number;
        profileKey: string;
        profileName: string;
    };

    type ViewerVideo = {
        id: number;
        youtube_id: string;
        channel_id: number;
        title: string;
        description: string;
        published_at: number | null;
        duration_seconds: number | null;
        thumbnail_url: string | null;
        channel_title: string;
        channel_youtube_id: string;
        watched: number;
        favorite: number;
        ignored: number;
    };

    type BulkActionFeedback = {
        message: string;
        tone: 'success' | 'warning' | 'error';
        undo: {
            requestedVideoIds: number[];
            originalStates: Array<{
                videoId: number;
                watched: ViewerSelectionFlagValue;
                favorite: ViewerSelectionFlagValue;
                ignored: ViewerSelectionFlagValue;
            }>;
        } | null;
    };

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

    function getVisiblePages(current: number, total: number): Array<number | 'ellipsis'>
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

        const pages: Array<number | 'ellipsis'> = [1];

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

    function applyVisibleVideoBulkFlag(kind: ViewerSelectionFlagKind, value: ViewerSelectionFlagValue, updatedVideoIds: number[])
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

    let visiblePages = getVisiblePages(currentPage, totalPages);

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
    <section class="panel">
        <h1>Video List</h1>
        {#if activeVirtualChannel}
            <p class="muted">Virtual channel: {activeVirtualChannel.name}</p>
        {/if}
        <form method="GET" class="stack" on:submit={handleFilterSubmit}>
            <div class="fields filter-row">
                <label class="boxed-field compact-search-field">
                    <span class="boxed-field-label">Search</span>
                    <input
                        name="term"
                        bind:value={termInput}
                        placeholder="title/description"
                        on:input={scheduleApply}
                        on:keydown={handleFilterKeydown}
                    />
                </label>
                <div class="compact-date-field">
                    <DatePicker label="From" name="dateFrom" bind:value={dateFromInput} max={today} onCommit={handleImmediateFilterChange} />
                </div>
                <div class="compact-date-field">
                    <DatePicker label="To" name="dateTo" bind:value={dateToInput} max={today} onCommit={handleImmediateFilterChange} />
                </div>
                <label class="boxed-field compact-channel-field">
                    <span class="boxed-field-label">Source Channel</span>
                    <select name="channelId" bind:value={channelIdInput} on:change={handleImmediateFilterChange}>
                        <option value="">Any</option>
                        {#each data.channels as ch}
                            <option value={ch.id}>{ch.title}</option>
                        {/each}
                    </select>
                </label>
                <label class="boxed-field compact-field">
                    <span class="boxed-field-label">Per page</span>
                    <input
                        type="number"
                        name="limit"
                        min="1"
                        max="1000"
                        bind:value={limitInput}
                        on:input={scheduleApply}
                        on:keydown={handleFilterKeydown}
                    />
                </label>
                <input type="hidden" name="watched" value={watchedMode === 'watched' ? 'watched' : 'all'} />
                <label class="filter-toggle">
                    <input
                        type="checkbox"
                        name="unwatchedOnly"
                        value="1"
                        checked={watchedMode === 'unwatched'}
                        on:change={handleWatchedOnlyChange}
                    />
                    <span>Unwatched only</span>
                </label>
                <label class="filter-toggle">
                    <input type="checkbox" name="showIgnored" value="1" bind:checked={showIgnored} on:change={handleImmediateFilterChange} />
                    <span>Show ignored</span>
                </label>
                {#if f.groupId != null}
                    <input type="hidden" name="groupId" value={f.groupId} />
                {/if}
                <input type="hidden" name="offset" value="0" />
            </div>
        </form>
    </section>

    <div class="bulk-action-slot" class:is-empty={!hasActiveSelection}>
        <div
            class="bulk-action-bar"
            class:is-hidden={!hasActiveSelection}
            role="status"
            aria-live="polite"
            aria-hidden={!hasActiveSelection}
        >
            <div class="bulk-action-copy">
                <span>{bulkActionFeedback?.message ?? `${selectedCount} ${selectedCount === 1 ? 'video selected' : 'videos selected'}`}</span>
                {#if offPageSelectedCount > 0}
                    <span class="bulk-action-note">
                        {offPageSelectedCount} {offPageSelectedCount === 1 ? 'selected video is' : 'selected videos are'} on other pages.
                    </span>
                {/if}
            </div>
            <div class="bulk-action-controls-wrap">
                <div class="bulk-action-undo-slot">
                    <button
                        type="button"
                        class="bulk-action-undo"
                        class:is-hidden={!bulkActionFeedback?.undo}
                        aria-hidden={!bulkActionFeedback?.undo}
                        tabindex={!bulkActionFeedback?.undo ? -1 : 0}
                        disabled={!bulkActionFeedback?.undo || bulkActionPending}
                        on:click={() => void handleBulkUndo()}
                    >
                        Undo
                    </button>
                </div>

                <div class="bulk-action-controls" role="group" aria-label="Bulk selection flags">
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={watchedControlState}
                    disabled={bulkActionPending}
                    on:click={() => void handleBulkFlagToggle('watched', watchedControlState)}
                >
                    <span class="bulk-flag-box" data-state={watchedControlState}>
                        {#if watchedControlState === 'checked'}
                            &#10003;
                        {:else if watchedControlState === 'mixed'}
                            &#9632;
                        {/if}
                    </span>
                    <span>Watched</span>
                </button>
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={favoriteControlState}
                    disabled={bulkActionPending}
                    on:click={() => void handleBulkFlagToggle('favorite', favoriteControlState)}
                >
                    <span class="bulk-flag-box" data-state={favoriteControlState}>
                        {#if favoriteControlState === 'checked'}
                            &#10003;
                        {:else if favoriteControlState === 'mixed'}
                            &#9632;
                        {/if}
                    </span>
                    <span>Favorite</span>
                </button>
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={ignoredControlState}
                    disabled={bulkActionPending}
                    on:click={() => void handleBulkFlagToggle('ignored', ignoredControlState)}
                >
                    <span class="bulk-flag-box" data-state={ignoredControlState}>
                        {#if ignoredControlState === 'checked'}
                            &#10003;
                        {:else if ignoredControlState === 'mixed'}
                            &#9632;
                        {/if}
                    </span>
                    <span>Ignored</span>
                </button>
                </div>
            </div>
        </div>
    </div>

    {#if data.totalCount > 0 && totalPages > 1}
        <div class="toolbar">
            <div class="pager" aria-label="Pagination">
                {#each visiblePages as page}
                    {#if page === 'ellipsis'}
                        <span class="pager-ellipsis">..</span>
                    {:else if page === currentPage}
                        <span class="pager-link pager-link-current" aria-current="page">{page}</span>
                    {:else}
                        <a class="pager-link" href={buildPageHref(page as number)}>{page}</a>
                    {/if}
                {/each}
            </div>
        </div>
    {/if}

    <section class="panel viewer-results-panel">
        {#if data.videos.length === 0}
            <p class="muted">No videos match these filters.</p>
        {:else}
            <div class="grid">
                {#each visibleVideos as v}
                    <VideoCard
                        video={v}
                        filters={f}
                        isSelected={selectionState.selectedVideoIds.includes(v.id)}
                        onCardMouseDown={handleCardMouseDown}
                        onCardClick={handleCardClick}
                    />
                {/each}
            </div>
        {/if}
    </section>
</div>

<style>
    .viewer-page {
        gap: 0.5rem;
    }

    .viewer-page > * {
        margin-block: 0;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(clamp(250px, 18vw, 320px), 1fr));
        gap: 1rem;
    }

    .compact-field {
        flex: 0 0 7rem;
    }

    .compact-field input {
        min-width: 0;
    }

    .compact-date-field {
        flex: 0 0 10.5rem;
    }

    .boxed-field {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-height: 2.5rem;
        padding: 0.45rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-soft);
        color: var(--text);
    }

    .boxed-field-label {
        color: var(--text-muted);
        font-size: 0.8rem;
    }

    .boxed-field input,
    .boxed-field select {
        min-height: auto;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
    }

    .compact-search-field,
    .compact-channel-field {
        flex: 0 1 22rem;
    }

    .viewer-results-panel {
        padding: 0.6rem;
    }

    .filter-row {
        align-items: stretch;
    }

    .filter-toggle {
        flex: 0 0 auto;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        min-height: 2.5rem;
        padding: 0.15rem 0;
        color: var(--text);
        white-space: nowrap;
    }

    .filter-toggle input {
        width: 1rem;
        min-width: 1rem;
        height: 1rem;
        min-height: 1rem;
        margin: 0;
        accent-color: var(--accent);
    }

    .toolbar {
        justify-content: center;
    }

    .bulk-action-slot {
        min-height: 3.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-block: 0;
    }

    .bulk-action-slot.is-empty {
        pointer-events: none;
    }

    .bulk-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.85rem;
        width: min(100%, 54rem);
        min-height: 3.1rem;
        padding: 0.45rem 0.85rem;
        border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
        border-radius: var(--radius);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--accent) 16%, var(--bg-soft)), var(--bg-soft));
        box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.12);
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
    }

    .bulk-action-bar.is-hidden {
        visibility: hidden;
    }

    .bulk-action-copy {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.6rem;
        min-height: 1.9rem;
        min-width: 0;
        white-space: nowrap;
    }

    .bulk-action-copy span {
        color: var(--text-muted);
        font-size: 0.88rem;
    }

    .bulk-action-note {
        color: color-mix(in srgb, var(--accent) 72%, white);
        font-weight: 600;
    }

    .bulk-action-controls-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.55rem;
        flex: 0 1 auto;
        min-width: 0;
    }

    .bulk-action-undo-slot {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        width: 4.8rem;
        min-width: 4.8rem;
    }

    .bulk-action-undo {
        min-height: 1.65rem;
        width: 4.8rem;
        padding: 0.2rem 0.55rem;
        border: 1px solid currentColor;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-weight: 700;
        box-sizing: border-box;
    }

    .bulk-action-undo.is-hidden {
        visibility: hidden;
        pointer-events: none;
    }

    .bulk-action-undo:disabled {
        opacity: 0.65;
        cursor: wait;
    }

    .bulk-action-controls {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.45rem;
        align-items: center;
        justify-content: flex-end;
        white-space: nowrap;
    }

    .bulk-flag-control {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-height: 2rem;
        padding: 0.3rem 0.65rem;
        border: 1px solid color-mix(in srgb, var(--border) 75%, var(--accent));
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--text);
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        font-size: 0.88rem;
    }

    .bulk-flag-control {
        color: #24303d;
    }

    .bulk-flag-control span {
        color: inherit;
    }

    .bulk-flag-control:hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
        transform: translateY(-1px);
    }

    .bulk-flag-control:disabled {
        opacity: 0.65;
        cursor: wait;
    }

    .bulk-flag-control[data-state='checked'] {
        background: color-mix(in srgb, var(--accent) 18%, white);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }

    .bulk-flag-control[data-state='mixed'] {
        background: color-mix(in srgb, var(--accent) 12%, white);
        border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    }

    .bulk-flag-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.1rem;
        height: 1.1rem;
        border: 2px solid color-mix(in srgb, var(--accent) 65%, var(--border));
        border-radius: 0.28rem;
        background: white;
        color: var(--accent);
        font-size: 0.82rem;
        font-weight: 800;
        line-height: 1;
    }

    .bulk-flag-box[data-state='checked'] {
        background: color-mix(in srgb, var(--accent) 80%, white);
        color: white;
    }

    .bulk-flag-box[data-state='mixed'] {
        background: color-mix(in srgb, var(--accent) 32%, white);
        color: var(--accent);
    }

    .pager {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        flex-wrap: wrap;
        margin-inline: auto;
    }

    .pager-link,
    .pager-ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2.5rem;
        min-height: 2.5rem;
        padding: 0.45rem 0.65rem;
        border-radius: var(--radius-sm);
    }

    .pager-link {
        border: 1px solid var(--border);
        background: var(--bg-soft);
        color: var(--text);
        text-decoration: none;
    }

    .pager-link-current {
        border: 2px solid var(--accent);
        background: var(--accent);
        color: white;
        font-weight: 700;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
    }

    .pager-ellipsis {
        color: var(--text-muted);
    }

    @media (max-width: 900px) {
        .bulk-action-bar {
            width: 100%;
        }
    }
</style>

