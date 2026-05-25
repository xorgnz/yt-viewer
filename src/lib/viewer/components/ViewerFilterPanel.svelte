<script lang="ts">
    import DatePicker from '$lib/components/DatePicker.svelte';
    import type { SourceChannel } from '$lib/entities/sourceChannel';
    import {
        ViewerSort,
        ViewerWatchedFilter
    } from '$lib/viewer/ViewerFilters';
    import type {
        ViewerFilterInputState,
        ViewerFilters,
    } from '$lib/viewer/ViewerFilters';

    export let filters: ViewerFilters;
    export let channels: SourceChannel[] = [];
    export let activeVirtualChannelName: string | null = null;
    export let today = '';
    export let onApplyFilters: (inputState: ViewerFilterInputState) => void = () => undefined;

    let termInput = '';
    let dateFromInput = '';
    let dateToInput = '';
    let channelIdInput = '';
    let sortMode: ViewerSort = ViewerSort.Newest;
    let limitInput = '';
    let watchedMode: ViewerFilters['watched'] = ViewerWatchedFilter.All;
    let showIgnored = false;
    let lastAppliedFiltersKey = '';
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const FILTER_DEBOUNCE_MS = 450;

    function buildFiltersKey(nextFilters: ViewerFilters): string
    {
        return JSON.stringify({
            term: nextFilters.term || '',
            watched: nextFilters.watched,
            ignored: nextFilters.ignored,
            dateFromInput: nextFilters.dateFromInput,
            dateToInput: nextFilters.dateToInput,
            channelId: nextFilters.channelId != null ? String(nextFilters.channelId) : '',
            sort: nextFilters.sort,
            limit: String(nextFilters.limit)
        });
    }

    function toInputState(): ViewerFilterInputState
    {
        return {
            termInput,
            dateFromInput,
            dateToInput,
            channelIdInput,
            sortMode,
            limitInput,
            watchedMode,
            showIgnored
        };
    }

    function clearPendingApply()
    {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
    }

    function applyNow()
    {
        clearPendingApply();
        onApplyFilters(toInputState());
    }

    function scheduleApply()
    {
        clearPendingApply();
        debounceTimer = setTimeout(() => {
            applyNow();
        }, FILTER_DEBOUNCE_MS);
    }

    function handleSubmit(event: SubmitEvent)
    {
        event.preventDefault();
        applyNow();
    }

    function handleTermInput()
    {
        scheduleApply();
    }

    function handleTextKeydown(event: KeyboardEvent)
    {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        applyNow();
    }

    function handleDateCommit()
    {
        applyNow();
    }

    function handleChannelChange()
    {
        applyNow();
    }

    function handleSortChange()
    {
        applyNow();
    }

    function handleLimitInput()
    {
        scheduleApply();
    }

    function handleWatchedOnlyChange(event: Event)
    {
        const checked = (event.currentTarget as HTMLInputElement).checked;
        watchedMode = checked
            ? ViewerWatchedFilter.Unwatched
            : (watchedMode === ViewerWatchedFilter.Unwatched ? ViewerWatchedFilter.All : watchedMode);
        applyNow();
    }

    function handleShowIgnoredChange()
    {
        applyNow();
    }

    $: {
        const nextFiltersKey = buildFiltersKey(filters);

        if (nextFiltersKey !== lastAppliedFiltersKey) {
            termInput = filters.term || '';
            dateFromInput = filters.dateFromInput;
            dateToInput = filters.dateToInput;
            channelIdInput = filters.channelId != null ? String(filters.channelId) : '';
            sortMode = filters.sort;
            limitInput = String(filters.limit);
            watchedMode = filters.watched;
            showIgnored = filters.ignored !== undefined && filters.ignored !== null && filters.ignored !== 'hide';
            lastAppliedFiltersKey = nextFiltersKey;
        }
    }
</script>

<section class="panel">
    <h1>Video List</h1>
    {#if activeVirtualChannelName}
        <p class="muted">Virtual channel: {activeVirtualChannelName}</p>
    {/if}
    <form method="GET" class="stack" on:submit={handleSubmit}>
        <div class="fields filter-row">
            <label class="boxed-field compact-search-field">
                <span class="boxed-field-label">Search</span>
                <input
                    name="term"
                    bind:value={termInput}
                    placeholder="title/description"
                    on:input={handleTermInput}
                    on:keydown={handleTextKeydown}
                />
            </label>
            <div class="compact-date-field">
                <DatePicker
                    label="From"
                    name="dateFrom"
                    bind:value={dateFromInput}
                    max={today}
                    onCommit={handleDateCommit}
                />
            </div>
            <div class="compact-date-field">
                <DatePicker
                    label="To"
                    name="dateTo"
                    bind:value={dateToInput}
                    max={today}
                    onCommit={handleDateCommit}
                />
            </div>
            <label class="boxed-field compact-channel-field">
                <span class="boxed-field-label">Source Channel</span>
                <select name="channelId" bind:value={channelIdInput} on:change={handleChannelChange}>
                    <option value="">Any</option>
                    {#each channels as channel}
                        <option value={channel.id}>{channel.title}</option>
                    {/each}
                </select>
            </label>
            <label class="boxed-field compact-sort-field">
                <span class="boxed-field-label">Sort</span>
                <select name="sort" bind:value={sortMode} on:change={handleSortChange}>
                    <option value={ViewerSort.Newest}>Newest first</option>
                    <option value={ViewerSort.Oldest}>Oldest first</option>
                    <option value={ViewerSort.TitleAsc}>Title A-Z</option>
                    <option value={ViewerSort.TitleDesc}>Title Z-A</option>
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
                    on:input={handleLimitInput}
                    on:keydown={handleTextKeydown}
                />
            </label>
            <input
                type="hidden"
                name="watched"
                value={watchedMode === ViewerWatchedFilter.Watched ? ViewerWatchedFilter.Watched : ViewerWatchedFilter.All}
            />
            <label class="filter-toggle">
                <input
                    type="checkbox"
                    name="unwatchedOnly"
                    value="1"
                    checked={watchedMode === ViewerWatchedFilter.Unwatched}
                    on:change={handleWatchedOnlyChange}
                />
                <span>Unwatched only</span>
            </label>
            <label class="filter-toggle">
                <input
                    type="checkbox"
                    name="showIgnored"
                    value="1"
                    bind:checked={showIgnored}
                    on:change={handleShowIgnoredChange}
                />
                <span>Show ignored</span>
            </label>
            {#if filters.virtualChannelId != null}
                <input type="hidden" name="virtualChannelId" value={filters.virtualChannelId} />
            {/if}
            <input type="hidden" name="offset" value="0" />
        </div>
    </form>
</section>

<style>
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

    .compact-sort-field {
        flex: 0 0 12rem;
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
</style>
<!-- apply-patch-anchor - do not delete -->
