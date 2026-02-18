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
</script>

<h1>Viewer</h1>

<form method="GET" class="filters">
    <div class="row">
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
            <a class="card" href={`/viewer/watch/${v.youtube_id}`} title={v.title}>
                <div class="thumb">
                    {#if v.thumbnail_url}
                        <img src={v.thumbnail_url} alt={v.title} loading="lazy" />
                    {:else}
                        <div class="placeholder"></div>
                    {/if}
                    <div class="badges">
                        {#if v.ignored}
                            <span class="badge ignored">ignored</span>
                        {/if}
                        {#if v.favorite}
                            <span class="badge favorite">★</span>
                        {/if}
                        {#if v.watched}
                            <span class="badge watched">watched</span>
                        {/if}
                    </div>
                </div>
                <div class="meta">
                    <div class="title">{v.title}</div>
                    <div class="chan">{v.channel_title}</div>
                    <div class="pub">{fmtDate(v.published_at)}</div>
                </div>
            </a>
            <div class="actions">
                <form method="POST" action="?/toggleFlag">
                    <input type="hidden" name="videoId" value={v.id} />
                    <input type="hidden" name="kind" value="favorite" />
                    <input type="hidden" name="value" value={v.favorite ? 0 : 1} />
                    <button type="submit" class:active={!!v.favorite} aria-pressed={!!v.favorite} title={v.favorite ? 'Unfavorite' : 'Mark favorite'}>
                        {v.favorite ? '★ Favorited' : '☆ Favorite'}
                    </button>
                </form>
                <form method="POST" action="?/toggleFlag">
                    <input type="hidden" name="videoId" value={v.id} />
                    <input type="hidden" name="kind" value="ignored" />
                    <input type="hidden" name="value" value={v.ignored ? 0 : 1} />
                    <button type="submit" class="ignored" class:active={!!v.ignored} aria-pressed={!!v.ignored} title={v.ignored ? 'Unignore' : 'Ignore video'}>
                        {v.ignored ? '✓ Ignored' : 'Ignore'}
                    </button>
                </form>
            </div>
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
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: .75rem;
    }
    .card { display: block; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; color: inherit; text-decoration: none; background: #fff; }
    .actions { display: flex; gap: .5rem; align-items: center; padding: .35rem .25rem .75rem; }
    .actions form { display: inline; }
    .actions button {
        font-size: .8rem;
        padding: .25rem .5rem;
        border: 1px solid #333;
        background: #444;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
    }
    .actions button:hover { background: #3a3a3a; }
    .actions button.active {
        background: #b07d00; /* darker gold for active state */
        border-color: #7a5a00;
        color: #fff;
    }
    /* Override: when the Ignored button is active, make it red */
    .actions button.ignored.active {
        background: #b00020; /* red for selected ignored */
        border-color: #7a0015;
        color: #fff;
    }
    .thumb { position: relative; aspect-ratio: 16/9; background: #f2f2f2; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb .placeholder { width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #eee, #eee 10px, #f6f6f6 10px, #f6f6f6 20px); }
    .badges { position: absolute; top: 4px; left: 4px; display: flex; gap: 4px; }
    .badge { padding: 2px 6px; font-size: .7rem; border-radius: 3px; background: rgba(0,0,0,.65); color: #fff; }
    .badge.favorite { background: #e3b341; color: #161616; }
    .badge.ignored { background: #999; }
    .badge.watched { background: #2e7d32; }
    .meta { padding: .5rem; }
    .title { font-weight: 600; font-size: .95rem; margin-bottom: .25rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .chan { color: #555; font-size: .85rem; }
    .pub { color: #777; font-size: .8rem; }
</style>
