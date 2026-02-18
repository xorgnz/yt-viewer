<script lang="ts">
    export let data: {
        channels: Array<{ id: number; youtube_id: string; title: string; description: string; thumbnail_url: string | null; published_at: number | null }>
    };

    let creating = false;
    let lookupStatus: string = '';

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
            lookupStatus = 'Enter a YouTube channel ID first (starts with UC...)';
            return;
        }
        try {
            creating = true;
            const res = await fetch(`/admin/channels/lookup?youtube_id=${encodeURIComponent(youtubeId)}`);
            const body = await res.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
            if (!res.ok || !body?.ok) {
                lookupStatus = body?.error || `Lookup failed (${res.status})`;
                return;
            }
            const data = body.data as { title?: string; description?: string; thumbnail_url?: string | null; published_at?: number | null };
            // Fill inputs if empty or always overwrite? Prefer overwrite for convenience; user can edit.
            const titleEl = formEl.querySelector('input[name="title"]') as HTMLInputElement | null;
            const descEl = formEl.querySelector('input[name="description"]') as HTMLInputElement | null;
            const thumbEl = formEl.querySelector('input[name="thumbnail_url"]') as HTMLInputElement | null;
            const pubEl = formEl.querySelector('input[name="published_at"]') as HTMLInputElement | null;
            if (titleEl) titleEl.value = data.title || '';
            if (descEl) descEl.value = data.description || '';
            if (thumbEl) thumbEl.value = data.thumbnail_url || '';
            if (pubEl) pubEl.value = data.published_at != null ? String(data.published_at) : '';
            lookupStatus = 'Filled from YouTube ✓';
        } catch (e: any) {
            lookupStatus = 'Network error during lookup';
        } finally {
            creating = false;
        }
    }
</script>

<h1>Channels</h1>

<section class="create">
    <h2>Add Channel</h2>
    <form method="post" action="?/create">
        <div class="row">
            <label>YouTube ID
                <input name="youtube_id" required />
            </label>
            <label>Title
                <input name="title" required />
            </label>
        </div>
        <div class="row">
            <button type="button" on:click={fetchFromYouTube} disabled={creating}>Fetch from YouTube</button>
            {#if lookupStatus}
                <span class="status">{lookupStatus}</span>
            {/if}
        </div>
        <div class="row">
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
        <button type="submit">Add</button>
    </form>
    <hr />
</section>

<section class="list">
    <h2>Existing Channels</h2>
    {#if data.channels.length === 0}
        <p>No channels yet.</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>YouTube ID</th>
                    <th>Description</th>
                    <th>Thumb</th>
                    <th>Published</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each data.channels as ch}
                    <tr>
                        <td>
                            <input name="title" value={ch.title} required form={'f-' + ch.id} />
                        </td>
                        <td><code>{ch.youtube_id}</code></td>
                        <td>
                            <input name="description" value={ch.description} form={'f-' + ch.id} />
                        </td>
                        <td>
                            <input name="thumbnail_url" value={ch.thumbnail_url || ''} form={'f-' + ch.id} />
                        </td>
                        <td>
                            <input name="published_at" type="number" value={ch.published_at ?? ''} form={'f-' + ch.id} />
                        </td>
                        <td class="actions">
                            <form id={'f-' + ch.id} method="post" action="?/update" style="display:inline">
                                <input type="hidden" name="id" value={ch.id} />
                                <button type="submit">Save</button>
                            </form>
                            <form method="post" action="?/refresh" style="display:inline; margin-left: .25rem;">
                                <input type="hidden" name="id" value={ch.id} />
                                <button type="submit">Refresh</button>
                            </form>
                            <form method="post" action="?/delete" style="display:inline">
                                <input type="hidden" name="id" value={ch.id} />
                                <button type="submit">Delete</button>
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</section>

<style>
    h1 { margin: 0 0 1rem 0; }
    section.create { margin: 1rem 0 2rem; }
    form { margin: 0.25rem 0; }
    .row { display: flex; gap: 1rem; margin: 0.25rem 0; flex-wrap: wrap; }
    label { display: flex; flex-direction: column; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; vertical-align: top; }
    td.actions { white-space: nowrap; }
    input { min-width: 10ch; }
    .status { margin-left: .5rem; font-size: .9rem; color: #555; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>
