<script lang="ts">
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
        channels: Array<{ id: number; youtube_id: string; title: string }>;
        groups: Array<{ id: number; name: string }>;
        profileId: number;
        profileKey: string;
        profileName: string;
    };

    const f = data.filters;
    const activeVirtualChannel = data.groups.find((group) => group.id === f.groupId) ?? null;
    const today = new Date().toISOString().slice(0, 10);

    function nextOffset(): number { return f.offset + f.limit; }
    function prevOffset(): number { return Math.max(0, f.offset - f.limit); }
    import DatePicker from '$lib/components/DatePicker.svelte';
    import VideoCard from '$lib/components/VideoCard.svelte';
</script>

<div class="page stack">
    <section class="panel">
        <h1>Video List</h1>
        {#if activeVirtualChannel}
            <p class="muted">Virtual channel: {activeVirtualChannel.name}</p>
        {/if}
        <form method="GET" class="stack">
            <div class="fields">
                <label class="boxed-field">
                    <span class="boxed-field-label">Search</span>
                    <input name="term" value={f.term || ''} placeholder="title/description" />
                </label>
                <div class="compact-date-field">
                    <DatePicker label="From" name="dateFrom" value={f.dateFromInput} max={today} />
                </div>
                <div class="compact-date-field">
                    <DatePicker label="To" name="dateTo" value={f.dateToInput} max={today} />
                </div>
            </div>
            <div class="fields">
                <label class="boxed-field">
                    <span class="boxed-field-label">Source Channel</span>
                    <select name="channelId" value={f.channelId ?? ''}>
                        <option value="">Any</option>
                        {#each data.channels as ch}
                            <option value={ch.id} selected={f.channelId === ch.id}>{ch.title}</option>
                        {/each}
                    </select>
                </label>
                <label class="boxed-field compact-field">
                    <span class="boxed-field-label">Per page</span>
                    <input type="number" name="limit" min="1" max="1000" value={f.limit} />
                </label>
                <label class="filter-toggle">
                    <input type="checkbox" name="unwatchedOnly" value="1" checked={f.watched === 'unwatched'} />
                    <span>Unwatched only</span>
                </label>
                <label class="filter-toggle">
                    <input type="checkbox" name="showIgnored" value="1" checked={f.ignored === 'show'} />
                    <span>Show ignored</span>
                </label>
                {#if f.groupId != null}
                    <input type="hidden" name="groupId" value={f.groupId} />
                {/if}
                <input type="hidden" name="offset" value={f.offset} />
                <div class="inline-actions">
                    <button type="submit">Apply</button>
                </div>
            </div>
        </form>
    </section>

    <section class="stack">
        <div class="toolbar">
            <div>{data.videos.length} videos</div>
            <div class="pager">
                <a class="btn btn-secondary" rel="prev" href={`?${new URLSearchParams({
                    term: f.term || '',
                    watched: f.watched,
                    ignored: f.ignored,
                    dateFrom: f.dateFromInput,
                    dateTo: f.dateToInput,
                    channelId: f.channelId != null ? String(f.channelId) : '',
                    groupId: f.groupId != null ? String(f.groupId) : '',
                    limit: String(f.limit),
                    offset: String(prevOffset())
                }).toString()}`}>Prev</a>
                <a class="btn btn-secondary" rel="next" href={`?${new URLSearchParams({
                    term: f.term || '',
                    watched: f.watched,
                    ignored: f.ignored,
                    dateFrom: f.dateFromInput,
                    dateTo: f.dateToInput,
                    channelId: f.channelId != null ? String(f.channelId) : '',
                    groupId: f.groupId != null ? String(f.groupId) : '',
                    limit: String(f.limit),
                    offset: String(nextOffset())
                }).toString()}`}>Next</a>
            </div>
            <div class="hint">Dates: {f.dateFromInput || 'Any'} - {f.dateToInput || 'Any'}</div>
            <div class="spacer"></div>
        </div>

        {#if data.videos.length === 0}
            <p class="muted">No videos match these filters.</p>
        {:else}
            <div class="grid">
                {#each data.videos as v}
                    <VideoCard video={v} filters={f} />
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
