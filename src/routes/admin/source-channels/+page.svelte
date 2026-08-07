<script lang="ts">
    import ThumbnailImage from '$lib/components/ThumbnailImage.svelte';
    import type { SourceChannelWithVideoStatsSFO } from '$lib/entities/SourceChannelWithVideoStats';

    export let data: {
        channels: SourceChannelWithVideoStatsSFO[]
    };

    type SourceChannelLookupResult = {
        youtube_id?: string;
        title?: string;
        description?: string;
        thumbnail_url?: string | null;
        published_at?: number | null;
    };

    let addDialog: HTMLDialogElement | null = null;
    let youtubeInput = '';
    let lookupPending = false;
    let lookupStatus: string = '';
    let lookupResult: SourceChannelLookupResult | null = null;

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

    function openAddDialog()
    {
        youtubeInput = '';
        lookupStatus = '';
        lookupResult = null;
        addDialog?.showModal();
    }

    function closeAddDialog()
    {
        addDialog?.close();
    }

    async function fetchFromYouTube(ev: Event)
    {
        ev.preventDefault();
        lookupStatus = '';
        lookupResult = null;

        const youtubeId = youtubeInput.trim();
        if (!youtubeId) {
            lookupStatus = 'Enter a YouTube channel ID, handle, or URL first';
            return;
        }

        try {
            lookupPending = true;
            const res = await fetch(`/admin/source-channels/lookup?youtube_id=${encodeURIComponent(youtubeId)}`);
            const body = await res.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
            if (!res.ok || !body?.ok) {
                lookupStatus = body?.error || `Lookup failed (${res.status})`;
                return;
            }

            lookupResult = body.data as SourceChannelLookupResult;
            lookupStatus = 'Channel found';
        } catch {
            lookupStatus = 'Network error during lookup';
        } finally {
            lookupPending = false;
        }
    }
</script>

<div class="page stack">
    <section class="panel">
        <h1>Source Channels</h1>
        <button type="button" on:click={openAddDialog}>Add Source Channel</button>
    </section>

    <dialog bind:this={addDialog} class="add-channel-dialog" aria-labelledby="h2_add_source_channel">
        <form method="post" action="?/create" class="add-channel-form">
            <div class="dialog-header">
                <h2 id="h2_add_source_channel">Add Source Channel</h2>
                <button type="button" class="dialog-close" aria-label="Close" on:click={closeAddDialog}>×</button>
            </div>

            <label>YouTube Channel
                <input
                    bind:value={youtubeInput}
                    required
                    placeholder="UC..., @Numberblocks, or https://www.youtube.com/@Numberblocks"
                />
            </label>

            <div class="inline-actions">
                <button type="button" on:click={fetchFromYouTube} disabled={lookupPending}>
                    {lookupPending ? 'Fetching...' : 'Find Channel'}
                </button>
                {#if lookupStatus}
                    <span class="status">{lookupStatus}</span>
                {/if}
            </div>

            {#if lookupResult}
                <section class="lookup-preview">
                    {#if lookupResult.thumbnail_url}
                        <ThumbnailImage src={lookupResult.thumbnail_url} alt={`${lookupResult.title || 'Source channel'} thumbnail`} className="lookup-thumb" />
                    {/if}
                    <div>
                        <h3>{lookupResult.title || lookupResult.youtube_id || 'Source channel'}</h3>
                        {#if lookupResult.youtube_id}
                            <p class="status">{lookupResult.youtube_id}</p>
                        {/if}
                        {#if lookupResult.description}
                            <p>{lookupResult.description}</p>
                        {/if}
                    </div>
                </section>

                <input type="hidden" name="youtube_id" value={lookupResult.youtube_id || youtubeInput.trim()} />
                <input type="hidden" name="title" value={lookupResult.title || ''} />
                <input type="hidden" name="description" value={lookupResult.description || ''} />
                <input type="hidden" name="thumbnail_url" value={lookupResult.thumbnail_url || ''} />
                <input type="hidden" name="published_at" value={lookupResult.published_at != null ? String(lookupResult.published_at) : ''} />
            {/if}

            <div class="dialog-actions">
                <button type="button" class="btn-secondary" on:click={closeAddDialog}>Cancel</button>
                <button type="submit" disabled={!lookupResult}>Add</button>
            </div>
        </form>
    </dialog>

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
                            <th class="th-count th-count-total">#</th>
                            <th class="th-count th-count-watched">W</th>
                            <th class="th-count th-count-favorite">F</th>
                            <th class="th-count th-count-ignored">I</th>
                            <th>Last Refresh</th>
                            <th class="th-count th-count-virtual">VC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.channels as ch}
                            <tr>
                                <td class="td-icon">
                                    {#if ch.sourceChannel.thumbnailUrl}
                                        <ThumbnailImage src={ch.sourceChannel.thumbnailUrl} alt={`${ch.sourceChannel.title} thumbnail`} className="thumb-preview" />
                                    {:else}
                                        <span class="muted">No image</span>
                                    {/if}
                                </td>
                                <td class="td-title">{ch.sourceChannel.title}</td>
                                <td class="desc">{ch.sourceChannel.description}</td>
                                <td class="td-count td-count-total">{ch.videoCount}</td>
                                <td class="td-count td-count-watched">{ch.watchedCount}</td>
                                <td class="td-count td-count-favorite">{ch.favoriteCount}</td>
                                <td class="td-count td-count-ignored">{ch.ignoredCount}</td>
                                <td>{fmtDateTime(ch.sourceChannel.lastRefreshedAt ?? null)}</td>
                                <td class="td-count td-count-virtual">{ch.virtualChannelCount}</td>
                                <td>
                                    <div class="inline-actions">
                                        <form method="post" action="?/refresh" class="inline-form">
                                            <input type="hidden" name="id" value={ch.sourceChannel.id} />
                                            <button type="submit">Refresh</button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={ch.sourceChannel.id} />
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
        width: 100%;
        height: auto;
        min-width: 80px;
        max-width: 100px;
        display: block;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    :global(.lookup-thumb) {
        width: 120px;
        height: auto;
        display: block;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .add-channel-dialog {
        width: min(620px, calc(100vw - 2rem));
        max-height: calc(100vh - 2rem);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0;
        background: var(--bg-panel);
        color: var(--text);
        box-shadow: var(--shadow-md);
    }

    .add-channel-dialog::backdrop {
        background: rgba(0, 0, 0, 0.62);
    }

    .add-channel-form {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-5);
    }

    .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
    }

    .dialog-header h2 {
        margin-bottom: 0;
    }

    .dialog-close {
        width: 2.25rem;
        height: 2.25rem;
        min-height: 0;
        padding: 0;
        font-size: 1.4rem;
        line-height: 1;
    }

    .lookup-preview {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: var(--space-4);
        padding: var(--space-4);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.04);
    }

    .lookup-preview h3 {
        margin-bottom: var(--space-2);
    }

    .lookup-preview p {
        margin-bottom: var(--space-2);
        color: var(--text-muted);
    }

    .lookup-preview p:last-child {
        margin-bottom: 0;
    }

    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
    }

    td, th {
        padding: 0.33rem;
    }

    .th-icon,
    .td-icon {
        min-width: 80px;
        max-width: 100px;
        padding: 0;
    }

    .th-title,
    .td-title {
        width: 300px;
        min-width: 200px;
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
        text-align: center;
    }

    .th-count-total,
    .td-count-total {
        background-color: rgba(255, 255, 255, 0.10);
    }

    .th-count-virtual,
    .td-count-virtual {
        background-color: rgba(116, 180, 255, 0.18);
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

    @media (max-width: 600px) {
        .lookup-preview {
            grid-template-columns: 1fr;
        }

        .dialog-actions {
            flex-direction: column-reverse;
        }
    }
</style>
<!-- apply-patch-anchor - do not delete -->
