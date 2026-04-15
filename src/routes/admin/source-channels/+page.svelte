<script lang="ts">
    import ThumbnailImage from '$lib/components/ThumbnailImage.svelte';

    export let data: {
        channels: Array<{
            id: number;
            youtube_id: string;
            title: string;
            description: string;
            thumbnail_url: string | null;
            published_at: number | null;
            last_refreshed_at: number | null;
            video_count: number;
            watched_count: number;
            favorite_count: number;
            ignored_count: number;
        }>
    };

    let creating = false;
    let lookupStatus: string = '';

    function fmtDate(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
        } catch {
            return '';
        }
    }

    function fmtDateTime(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            const iso = d.toISOString();
            return iso.slice(0, 10) + ' ' + iso.slice(11, 16);
        } catch {
            return '';
        }
    }

    async function fetchFromYouTube(ev: Event)
    {
        ev.preventDefault();
        lookupStatus = '';
        const formEl = (ev.currentTarget as HTMLButtonElement)?.closest('form') as HTMLFormElement | null;
        if (!formEl) return;

        const ytInput = formEl.querySelector('input[name="youtube_id"]') as HTMLInputElement | null;
        if (!ytInput) return;

        const youtubeId = (ytInput.value || '').trim();
        if (!youtubeId) {
            lookupStatus = 'Enter a YouTube channel ID, handle, or URL first';
            return;
        }

        try {
            creating = true;
            const res = await fetch(`/admin/source-channels/lookup?youtube_id=${encodeURIComponent(youtubeId)}`);
            const body = await res.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
            if (!res.ok || !body?.ok) {
                lookupStatus = body?.error || `Lookup failed (${res.status})`;
                return;
            }

            const lookup = body.data as {
                youtube_id?: string;
                title?: string;
                description?: string;
                thumbnail_url?: string | null;
                published_at?: number | null;
            };

            const titleEl = formEl.querySelector('input[name="title"]') as HTMLInputElement | null;
            const descEl = formEl.querySelector('input[name="description"]') as HTMLInputElement | null;
            const thumbEl = formEl.querySelector('input[name="thumbnail_url"]') as HTMLInputElement | null;
            const pubEl = formEl.querySelector('input[name="published_at"]') as HTMLInputElement | null;

            ytInput.value = lookup.youtube_id || youtubeId;
            if (titleEl) titleEl.value = lookup.title || '';
            if (descEl) descEl.value = lookup.description || '';
            if (thumbEl) thumbEl.value = lookup.thumbnail_url || '';
            if (pubEl) pubEl.value = lookup.published_at != null ? String(lookup.published_at) : '';

            lookupStatus = 'Filled from YouTube';
        } catch {
            lookupStatus = 'Network error during lookup';
        } finally {
            creating = false;
        }
    }
</script>

<div class="page stack">
    <section class="panel">
        <h1>Source Channels</h1>
        <h2>Add Source Channel</h2>
        <form method="post" action="?/create" class="stack">
            <div class="fields">
                <label>YouTube Channel
                    <input
                        name="youtube_id"
                        required
                        placeholder="UC..., @Numberblocks, or https://www.youtube.com/@Numberblocks"
                    />
                </label>
                <label>Title
                    <input name="title" required />
                </label>
            </div>
            <div class="inline-actions">
                <button type="button" on:click={fetchFromYouTube} disabled={creating}>Fetch from YouTube</button>
                {#if lookupStatus}
                    <span class="status">{lookupStatus}</span>
                {/if}
            </div>
            <div class="fields">
                <label>Description
                    <input name="description" />
                </label>
                <label>Thumbnail URL
                    <input name="thumbnail_url" />
                </label>
                <label>Published (ms)
                    <input name="published_at" type="number" />
                </label>
            </div>
            <div class="inline-actions">
                <button type="submit">Add</button>
            </div>
        </form>
    </section>

    <section class="panel">
        <h2>Existing Source Channels</h2>
        {#if data.channels.length === 0}
            <p class="muted">No source channels yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th class="th-icon">Icon</th>
                            <th class="th-title">Title</th>
                            <th>Description</th>
                            <th>Published</th>
                            <th class="th-count th-count-total">#</th>
                            <th class="th-count th-count-watched">W</th>
                            <th class="th-count th-count-favorite">F</th>
                            <th class="th-count th-count-ignored">I</th>
                            <th>Last Refreshed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.channels as ch}
                            <tr>
                                <td class="td-icon">
                                    {#if ch.thumbnail_url}
                                        <ThumbnailImage src={ch.thumbnail_url} alt={`${ch.title} thumbnail`} className="thumb-preview" />
                                    {:else}
                                        <span class="muted">No image</span>
                                    {/if}
                                </td>
                                <td class="td-title">{ch.title}</td>
                                <td class="desc">{ch.description}</td>
                                <td>{fmtDate(ch.published_at)}</td>
                                <td class="td-count td-count-total">{ch.video_count}</td>
                                <td class="td-count td-count-watched">{ch.watched_count}</td>
                                <td class="td-count td-count-favorite">{ch.favorite_count}</td>
                                <td class="td-count td-count-ignored">{ch.ignored_count}</td>
                                <td>{fmtDateTime(ch.last_refreshed_at)}</td>
                                <td>
                                    <div class="inline-actions">
                                        <form method="post" action="?/refresh" class="inline-form">
                                            <input type="hidden" name="id" value={ch.id} />
                                            <button type="submit">Refresh</button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={ch.id} />
                                            <button type="submit" class="btn-danger">Delete</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>

<style>
    :global(.thumb-preview) {
        width: 160px;
        height: auto;
        display: block;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .th-icon,
    .td-icon {
        width: 160px;
        min-width: 160px;
        max-width: 160px;
        padding: 0;
    }

    .th-title,
    .td-title {
        width: 300px;
        min-width: 300px;
        max-width: 300px;
    }

    .td-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .desc {
        max-width: 70ch;
    }

    tbody tr:nth-child(odd) {
        background-color: rgba(255, 255, 255, 0.03);
    }

    tbody tr:nth-child(even) {
        background-color: rgba(255, 255, 255, 0.06);
    }

    .th-count,
    .td-count {
        width: 40px;
        min-width: 40px;
        max-width: 40px;
        white-space: nowrap;
    }

    .th-count {
        text-align: center;
    }

    .td-count {
        font-family: monospace;
        text-align: right;
    }

    .th-count-total,
    .td-count-total {
        background-color: rgba(255, 255, 255, 0.10);
    }

    .th-count-watched,
    .td-count-watched {
        background-color: rgba(112, 201, 124, 0.16);
    }

    .th-count-favorite,
    .td-count-favorite {
        background-color: rgba(231, 197, 111, 0.20);
    }

    .th-count-ignored,
    .td-count-ignored {
        background-color: rgba(227, 126, 126, 0.20);
    }

    tbody tr:nth-child(odd) .td-count {
        background-image: linear-gradient(rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.10));
    }

    tbody tr:nth-child(even) .td-count {
        background-image: linear-gradient(rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.16));
    }
</style>
