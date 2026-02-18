<script lang="ts">
    export let data: {
        channels: Array<{ id: number; youtube_id: string; title: string; description: string; thumbnail_url: string | null; published_at: number | null }>
    };
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
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>
