<script lang="ts">
    export let data: {
        filters: {
            term?: string;
            watched: 'all' | 'watched' | 'unwatched';
            ignored: 'hide' | 'show';
            dateFrom: number | null;
            dateTo: number | null;
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

    function fmtDate(ms: number | null): string {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
        } catch { return ''; }
    }

    function nextOffset(): number { return f.offset + f.limit; }
    function prevOffset(): number { return Math.max(0, f.offset - f.limit); }
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
                <label>Search
                    <input name="term" value={f.term || ''} placeholder="title/description" />
                </label>
                <label>Watched
                    <select name="watched" bind:value={f.watched}>
                        <option value="all">All</option>
                        <option value="watched">Watched</option>
                        <option value="unwatched">Unwatched</option>
                    </select>
                </label>
                <label>Date from (ms)
                    <input type="number" name="dateFrom" value={f.dateFrom ?? ''} />
                </label>
                <label>Date to (ms)
                    <input type="number" name="dateTo" value={f.dateTo ?? ''} />
                </label>
            </div>
            <div class="fields">
                <label>Source Channel
                    <select name="channelId" value={f.channelId ?? ''}>
                        <option value="">Any</option>
                        {#each data.channels as ch}
                            <option value={ch.id} selected={f.channelId === ch.id}>{ch.title}</option>
                        {/each}
                    </select>
                </label>
                <label>Ignored
                    <select name="ignored" bind:value={f.ignored}>
                        <option value="hide">Hide ignored</option>
                        <option value="show">Show ignored</option>
                    </select>
                </label>
                <label>Per page
                    <input type="number" name="limit" min="1" max="1000" value={f.limit} />
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
                    dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
                    dateTo: f.dateTo != null ? String(f.dateTo) : '',
                    channelId: f.channelId != null ? String(f.channelId) : '',
                    groupId: f.groupId != null ? String(f.groupId) : '',
                    limit: String(f.limit),
                    offset: String(prevOffset())
                }).toString()}`}>Prev</a>
                <a class="btn btn-secondary" rel="next" href={`?${new URLSearchParams({
                    term: f.term || '',
                    watched: f.watched,
                    ignored: f.ignored,
                    dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
                    dateTo: f.dateTo != null ? String(f.dateTo) : '',
                    channelId: f.channelId != null ? String(f.channelId) : '',
                    groupId: f.groupId != null ? String(f.groupId) : '',
                    limit: String(f.limit),
                    offset: String(nextOffset())
                }).toString()}`}>Next</a>
            </div>
            <div class="hint">Dates: {fmtDate(f.dateFrom)} - {fmtDate(f.dateTo)}</div>
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
</style>
