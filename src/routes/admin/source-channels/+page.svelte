<script lang="ts">
    export let data: {
        channels: Array<{ id: number; youtube_id: string; title: string; description: string; thumbnail_url: string | null; published_at: number | null; last_refreshed_at: number | null }>
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
                            <th>Title</th>
                            <th>YouTube ID</th>
                            <th>Description</th>
                            <th>Thumb</th>
                            <th>Published</th>
                            <th>Last Refreshed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.channels as ch}
                            <tr>
                                <td>{ch.title}</td>
                                <td><code>{ch.youtube_id}</code></td>
                                <td class="desc">{ch.description}</td>
                                <td>
                                    {#if ch.thumbnail_url}
                                        <img src={ch.thumbnail_url} alt={`${ch.title} thumbnail`} class="thumb-preview" />
                                    {:else}
                                        <span class="muted">No image</span>
                                    {/if}
                                </td>
                                <td>{fmtDate(ch.published_at)}</td>
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
    .thumb-preview {
        width: 120px;
        height: auto;
        display: block;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .desc {
        max-width: 40ch;
    }
</style>
