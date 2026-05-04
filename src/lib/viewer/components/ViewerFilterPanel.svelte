<script lang="ts">
    import DatePicker from '$lib/components/DatePicker.svelte';
    import type {
        ViewerChannel,
        ViewerFilters,
        ViewerSort
    } from '$lib/viewer/types';

    export let filters: ViewerFilters;
    export let channels: ViewerChannel[] = [];
    export let activeVirtualChannelName: string | null = null;
    export let today = '';
    export let termInput = '';
    export let dateFromInput = '';
    export let dateToInput = '';
    export let channelIdInput = '';
    export let sortMode: ViewerSort = 'newest';
    export let limitInput = '';
    export let watchedMode: ViewerFilters['watched'] = 'all';
    export let showIgnored = false;
    export let onSubmit: (event: SubmitEvent) => void = () => undefined;
    export let onTermInput: () => void = () => undefined;
    export let onTextKeydown: (event: KeyboardEvent) => void = () => undefined;
    export let onDateCommit: () => void = () => undefined;
    export let onChannelChange: () => void = () => undefined;
    export let onSortChange: () => void = () => undefined;
    export let onLimitInput: () => void = () => undefined;
    export let onWatchedOnlyChange: (event: Event) => void = () => undefined;
    export let onShowIgnoredChange: () => void = () => undefined;
</script>

<section class="panel">
    <h1>Video List</h1>
    {#if activeVirtualChannelName}
        <p class="muted">Virtual channel: {activeVirtualChannelName}</p>
    {/if}
    <form method="GET" class="stack" on:submit={onSubmit}>
        <div class="fields filter-row">
            <label class="boxed-field compact-search-field">
                <span class="boxed-field-label">Search</span>
                <input
                    name="term"
                    bind:value={termInput}
                    placeholder="title/description"
                    on:input={onTermInput}
                    on:keydown={onTextKeydown}
                />
            </label>
            <div class="compact-date-field">
                <DatePicker
                    label="From"
                    name="dateFrom"
                    bind:value={dateFromInput}
                    max={today}
                    onCommit={onDateCommit}
                />
            </div>
            <div class="compact-date-field">
                <DatePicker
                    label="To"
                    name="dateTo"
                    bind:value={dateToInput}
                    max={today}
                    onCommit={onDateCommit}
                />
            </div>
            <label class="boxed-field compact-channel-field">
                <span class="boxed-field-label">Source Channel</span>
                <select name="channelId" bind:value={channelIdInput} on:change={onChannelChange}>
                    <option value="">Any</option>
                    {#each channels as channel}
                        <option value={channel.id}>{channel.title}</option>
                    {/each}
                </select>
            </label>
            <label class="boxed-field compact-sort-field">
                <span class="boxed-field-label">Sort</span>
                <select name="sort" bind:value={sortMode} on:change={onSortChange}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title_asc">Title A-Z</option>
                    <option value="title_desc">Title Z-A</option>
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
                    on:input={onLimitInput}
                    on:keydown={onTextKeydown}
                />
            </label>
            <input type="hidden" name="watched" value={watchedMode === 'watched' ? 'watched' : 'all'} />
            <label class="filter-toggle">
                <input
                    type="checkbox"
                    name="unwatchedOnly"
                    value="1"
                    checked={watchedMode === 'unwatched'}
                    on:change={onWatchedOnlyChange}
                />
                <span>Unwatched only</span>
            </label>
            <label class="filter-toggle">
                <input
                    type="checkbox"
                    name="showIgnored"
                    value="1"
                    bind:checked={showIgnored}
                    on:change={onShowIgnoredChange}
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
