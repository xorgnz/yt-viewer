<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import DatePicker from '$lib/components/DatePicker.svelte';
    import VideoCard from '$lib/components/VideoCard.svelte';
    import {
        clearPersistedViewerSelectionState,
        createViewerSelectionContextKey,
        createViewerSelectionState,
        getCurrentPageSelectedVideoIds,
        hasSelectionOutsideCurrentPage,
        loadPersistedViewerSelectionState,
        persistViewerSelectionState,
        reconcileViewerSelectionState,
        selectViewerSelectionRange,
        toggleViewerSelectionVideo,
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
        if (target?.closest('button, form')) {
            return;
        }

        if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            selectionState = selectViewerSelectionRange(selectionState, videoId);
            return;
        }

        if (!event.ctrlKey && !event.metaKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectionState = toggleViewerSelectionVideo(selectionState, videoId);
    }

    let visiblePages = getVisiblePages(currentPage, totalPages);

    $: f = data.filters;
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
        const nextCurrentPageVideoIds = data.videos.map((video) => video.id);
        const contextChanged = selectionState.contextKey !== nextContextKey;

        if (browser && selectionState.contextKey && contextChanged) {
            clearPersistedViewerSelectionState(selectionState.contextKey);
            hydratedSelectionContextKey = nextContextKey;
        }

        if (
            contextChanged ||
            selectionState.currentPageVideoIds.join(',') !== nextCurrentPageVideoIds.join(',')
        ) {
            selectionState = reconcileViewerSelectionState(selectionState, nextContextKey, nextCurrentPageVideoIds);
        }
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey !== selectionState.contextKey) {
        const persistedSelectionState = loadPersistedViewerSelectionState(
            selectionState.contextKey,
            selectionState.currentPageVideoIds
        );

        if (persistedSelectionState) {
            selectionState = persistedSelectionState;
        }

        hydratedSelectionContextKey = selectionState.contextKey;
    }

    $: if (browser && selectionState.contextKey && hydratedSelectionContextKey === selectionState.contextKey) {
        persistViewerSelectionState(selectionState);
    }
</script>

<div class="page stack">
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

    <section class="stack">
        {#if hasActiveSelection}
            <div class="bulk-action-bar" role="status" aria-live="polite">
                <div class="bulk-action-copy">
                    <strong>Bulk actions</strong>
                    <span>{selectedCount} {selectedCount === 1 ? 'video selected' : 'videos selected'}</span>
                    {#if offPageSelectedCount > 0}
                        <span class="bulk-action-note">
                            {offPageSelectedCount} {offPageSelectedCount === 1 ? 'selected video is' : 'selected videos are'} on other pages.
                        </span>
                    {/if}
                </div>
            </div>
        {/if}

        <div class="toolbar">
            {#if data.totalCount > 0 && totalPages > 1}
                <div class="pager" aria-label="Pagination">
                    {#each visiblePages as page}
                        {#if page === 'ellipsis'}
                            <span class="pager-ellipsis">..</span>
                        {:else if page === currentPage}
                            <span class="pager-link pager-link-current" aria-current="page">{page}</span>
                        {:else}
                            <a class="pager-link" href={buildPageHref(page)}>{page}</a>
                        {/if}
                    {/each}
                </div>
            {/if}
        </div>

        {#if data.videos.length === 0}
            <p class="muted">No videos match these filters.</p>
        {:else}
            <div class="grid">
                {#each data.videos as v}
                    <VideoCard
                        video={v}
                        filters={f}
                        isSelected={selectionState.selectedVideoIds.includes(v.id)}
                        onCardClick={handleCardClick}
                    />
                {/each}
            </div>
        {/if}
    </section>
</div>

<style>
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

    .bulk-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem 1rem;
        border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
        border-radius: var(--radius);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--accent) 16%, var(--bg-soft)), var(--bg-soft));
        box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.12);
    }

    .bulk-action-copy {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .bulk-action-copy strong {
        color: var(--text);
        font-size: 0.98rem;
    }

    .bulk-action-copy span {
        color: var(--text-muted);
        font-size: 0.92rem;
    }

    .bulk-action-note {
        color: color-mix(in srgb, var(--accent) 72%, white);
        font-weight: 600;
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
</style>
