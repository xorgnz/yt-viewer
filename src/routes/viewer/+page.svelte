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
    };

    const f = data.filters;

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

<h1>Video List</h1>

<form method="GET" class="filters">
    <div class="row">
        <label>Profile
            <select name="profile" bind:value={data.profileKey}>
                <option value="default">Default</option>
                <option value="child">Child</option>
            </select>
        </label>
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
    <div class="row">
        <label>Channel
            <select name="channelId" value={f.channelId ?? ''}>
                <option value="">Any</option>
                {#each data.channels as ch}
                    <option value={ch.id} selected={f.channelId === ch.id}>{ch.title}</option>
                {/each}
            </select>
        </label>
        <label>Group
            <select name="groupId" value={f.groupId ?? ''}>
                <option value="">Any</option>
                {#each data.groups as g}
                    <option value={g.id} selected={f.groupId === g.id}>{g.name}</option>
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
        <input type="hidden" name="offset" value={f.offset} />
        <button type="submit">Apply</button>
    </div>
</form>

<div class="toolbar">
    <div>{data.videos.length} videos</div>
    <div class="pager">
        <a rel="prev" href={`?${new URLSearchParams({
            term: f.term || '',
            watched: f.watched,
            ignored: f.ignored,
            profile: data.profileKey,
            dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
            dateTo: f.dateTo != null ? String(f.dateTo) : '',
            channelId: f.channelId != null ? String(f.channelId) : '',
            groupId: f.groupId != null ? String(f.groupId) : '',
            limit: String(f.limit),
            offset: String(prevOffset())
        }).toString()}`}>Prev</a>
        <a rel="next" href={`?${new URLSearchParams({
            term: f.term || '',
            watched: f.watched,
            ignored: f.ignored,
            profile: data.profileKey,
            dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
            dateTo: f.dateTo != null ? String(f.dateTo) : '',
            channelId: f.channelId != null ? String(f.channelId) : '',
            groupId: f.groupId != null ? String(f.groupId) : '',
            limit: String(f.limit),
            offset: String(nextOffset())
        }).toString()}`}>Next</a>
    </div>
    <div class="hint">Dates: {fmtDate(f.dateFrom)} — {fmtDate(f.dateTo)}</div>
    <div class="spacer"></div>
</div>

{#if data.videos.length === 0}
    <p>No videos match these filters.</p>
{:else}
    <div class="grid">
        {#each data.videos as v}
            <VideoCard video={v} profileKey={data.profileKey} filters={f} />
        {/each}
    </div>
{/if}

<style>
    h1 { margin: 0 0 1rem 0; }
    form.filters { margin: .5rem 0 1rem; }
    .row { display: flex; flex-wrap: wrap; gap: .75rem; align-items: flex-end; }
    label { display: flex; flex-direction: column; font-size: .9rem; }
    input, select { min-width: 12ch; }
    .toolbar { display: flex; align-items: center; gap: 1rem; margin: .5rem 0; }
    .toolbar .pager { display: flex; gap: .75rem; }
    .toolbar .hint { color: #666; font-size: .85rem; }
    .toolbar .spacer { flex: 1; }
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: .9rem;
    }
    /* Card styles moved into VideoCard component */
</style>
