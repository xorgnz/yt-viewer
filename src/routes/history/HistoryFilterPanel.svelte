<script lang="ts">
    import type { HistoryFilterInputState } from './HistoryFilterInputState';

    type HistoryFilterPanelFilters = {
        mode: 'sessions' | 'videos';
        channelId: string | null;
        dateFrom: number | null;
        dateTo: number | null;
        limit: number;
    };

    type HistoryFilterChannelOption = {
        id: string | number;
        title: string;
    };

    export let filters: HistoryFilterPanelFilters;
    export let channels: HistoryFilterChannelOption[] = [];
    export let profileName: string;
    export let onApplyFilters: (inputState: HistoryFilterInputState) => void = () => undefined;

    let modeInput: 'sessions' | 'videos' = filters.mode;
    let channelIdInput = filters.channelId != null ? String(filters.channelId) : '';
    let dateFromInput = filters.dateFrom != null ? String(filters.dateFrom) : '';
    let dateToInput = filters.dateTo != null ? String(filters.dateTo) : '';
    let limitInput = String(filters.limit);
    let lastAppliedFiltersKey = '';

    function buildFiltersKey(nextFilters: HistoryFilterPanelFilters): string
    {
        return JSON.stringify({
            mode: nextFilters.mode,
            channelId: nextFilters.channelId != null ? String(nextFilters.channelId) : '',
            dateFrom: nextFilters.dateFrom != null ? String(nextFilters.dateFrom) : '',
            dateTo: nextFilters.dateTo != null ? String(nextFilters.dateTo) : '',
            limit: String(nextFilters.limit)
        });
    }

    function toInputState(): HistoryFilterInputState
    {
        return {
            mode: modeInput,
            channelIdInput,
            dateFromInput,
            dateToInput,
            limitInput
        };
    }

    function handleSubmit(event: SubmitEvent)
    {
        event.preventDefault();
        onApplyFilters(toInputState());
    }

    $: {
        const nextFiltersKey = buildFiltersKey(filters);

        if (nextFiltersKey !== lastAppliedFiltersKey) {
            modeInput = filters.mode;
            channelIdInput = filters.channelId != null ? String(filters.channelId) : '';
            dateFromInput = filters.dateFrom != null ? String(filters.dateFrom) : '';
            dateToInput = filters.dateTo != null ? String(filters.dateTo) : '';
            limitInput = String(filters.limit);
            lastAppliedFiltersKey = nextFiltersKey;
        }
    }
</script>

<section class="panel">
    <h1>History</h1>
    <details class="help-box">
        <summary>How history works</summary>
        <div class="help-copy">
            <p>History sessions are created after more than 5 seconds of active watch time.</p>
            <p>While playback continues, the current session is updated about every 10 seconds.</p>
            <p>If you resume the same video within 5 minutes of the last history update, the same session is reused. Longer gaps start a new session.</p>
            <p>Time watched reflects time spent actively watching, including replays, not the furthest timestamp reached.</p>
            <p>The watched flag is separate from history. A video can appear in history without being marked watched, and manual watched toggles do not create history rows.</p>
        </div>
    </details>
    <form method="GET" class="fields" on:submit={handleSubmit}>
        <div>
            <div class="muted">Active Profile</div>
            <div>{profileName}</div>
        </div>
        <label>View
            <select name="mode" bind:value={modeInput}>
                <option value="sessions">Sessions</option>
                <option value="videos">By video</option>
            </select>
        </label>
        <label>Channel
            <select name="channelId" bind:value={channelIdInput}>
                <option value="">Any</option>
                {#each channels as channel}
                    <option value={String(channel.id)}>{channel.title}</option>
                {/each}
            </select>
        </label>
        <label>Date from (ms)
            <input type="number" name="dateFrom" bind:value={dateFromInput} />
        </label>
        <label>Date to (ms)
            <input type="number" name="dateTo" bind:value={dateToInput} />
        </label>
        <label>Per page
            <input type="number" name="limit" min="1" max="1000" bind:value={limitInput} />
        </label>
        <div class="inline-actions">
            <button type="submit">Apply</button>
        </div>
    </form>
</section>

<style>
    .help-box {
        margin-bottom: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
        padding: 0.75rem 1rem;
    }

    .help-box summary {
        cursor: pointer;
        font-weight: 600;
    }

    .help-copy {
        margin-top: 0.75rem;
        color: var(--text-muted);
    }

    .help-copy p {
        margin: 0 0 0.5rem 0;
    }
</style>
