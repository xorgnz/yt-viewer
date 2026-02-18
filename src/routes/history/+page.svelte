<script lang="ts">
    export let data: {
        filters: {
            profileKey: string;
            channelId: number | null;
            dateFrom: number | null;
            dateTo: number | null;
            limit: number;
            offset: number;
        };
        items: Array<{
            watched_at: number;
            profile_id: number;
            video_id: number;
            youtube_id: string;
            title: string;
            channel_id: number;
            channel_title: string;
        }>;
        channels: Array<{ id: number; youtube_id: string; title: string }>;
        profileId: number;
    };

    const f = data.filters;

    function fmtDate(ms: number): string
    {
        try {
            const d = new Date(ms);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
        } catch {
            return '';
        }
    }

    function humanDate(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
        } catch { return ''; }
    }

    function nextOffset(): number { return f.offset + f.limit; }
    function prevOffset(): number { return Math.max(0, f.offset - f.limit); }
</script>

<h1>History</h1>

<form method="GET" class="filters">
    <div class="row">
        <label>Profile
            <select name="profile" bind:value={f.profileKey}>
                <option value="default">Default</option>
                <option value="child">Child</option>
            </select>
        </label>
        <label>Channel
            <select name="channelId" value={f.channelId ?? ''}>
                <option value="">Any</option>
                {#each data.channels as ch}
                    <option value={ch.id} selected={f.channelId === ch.id}>{ch.title}</option>
                {/each}
            </select>
        </label>
        <label>Date from (ms)
            <input type="number" name="dateFrom" value={f.dateFrom ?? ''} />
        </label>
        <label>Date to (ms)
            <input type="number" name="dateTo" value={f.dateTo ?? ''} />
        </label>
        <label>Per page
            <input type="number" name="limit" min="1" max="1000" value={f.limit} />
        </label>
        <input type="hidden" name="offset" value={f.offset} />
        <button type="submit">Apply</button>
    </div>
</form>

<div class="toolbar">
    <div>{data.items.length} items</div>
    <div class="pager">
        <a rel="prev" href={`?${new URLSearchParams({
            profile: f.profileKey,
            channelId: f.channelId != null ? String(f.channelId) : '',
            dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
            dateTo: f.dateTo != null ? String(f.dateTo) : '',
            limit: String(f.limit),
            offset: String(prevOffset())
        }).toString()}`}>Prev</a>
        <a rel="next" href={`?${new URLSearchParams({
            profile: f.profileKey,
            channelId: f.channelId != null ? String(f.channelId) : '',
            dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
            dateTo: f.dateTo != null ? String(f.dateTo) : '',
            limit: String(f.limit),
            offset: String(nextOffset())
        }).toString()}`}>Next</a>
    </div>
    <div class="hint">Date filter: {humanDate(f.dateFrom)} — {humanDate(f.dateTo)}</div>
    <div class="spacer"></div>
</div>

{#if data.items.length === 0}
    <p>No history items match these filters.</p>
{:else}
    <table class="history">
        <thead>
            <tr>
                <th class="col-time">Watched</th>
                <th class="col-title">Title</th>
                <th class="col-chan">Channel</th>
                <th class="col-actions">Links</th>
            </tr>
        </thead>
        <tbody>
            {#each data.items as it}
                <tr>
                    <td class="col-time">{fmtDate(it.watched_at)}</td>
                    <td class="col-title">{it.title}</td>
                    <td class="col-chan">{it.channel_title}</td>
                    <td class="col-actions">
                        <a class="btn" href={`/viewer/watch/${it.youtube_id}?profile=${encodeURIComponent(f.profileKey)}`} title="Open in viewer">Open</a>
                        <a class="btn" href={`/viewer?channelId=${it.channel_id}&profile=${encodeURIComponent(f.profileKey)}`} title="More from channel">Channel</a>
                        <a class="btn" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${it.youtube_id}`} title="Open on YouTube">YouTube</a>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
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

    table.history { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #ddd; }
    table.history th, table.history td { padding: .5rem .5rem; border-bottom: 1px solid #eee; text-align: left; }
    table.history thead th { background: #f7f7f7; font-weight: 600; font-size: .9rem; }
    .col-time { white-space: nowrap; color: #555; font-size: .9rem; }
    .col-title { font-weight: 500; }
    .col-chan { color: #555; font-size: .9rem; }
    .col-actions { white-space: nowrap; }

    a.btn {
        display: inline-block;
        margin-right: .35rem;
        font-size: .8rem;
        padding: .2rem .5rem;
        border: 1px solid #333;
        background: #444;
        color: #fff;
        border-radius: 4px;
        text-decoration: none;
    }
    a.btn:hover { background: #3a3a3a; }
</style>
