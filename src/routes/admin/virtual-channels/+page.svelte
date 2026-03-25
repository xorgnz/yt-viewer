<script lang="ts">
    export let data: { groups: { id: number; name: string }[] };
    let newName = '';
</script>

<div class="page stack">
    <section class="panel">
        <h1>Virtual Channels</h1>
        <h2>Create Virtual Channel</h2>
        <form method="post" action="?/create" class="fields">
            <label>
                Name
                <input name="name" bind:value={newName} required />
            </label>
            <div class="inline-actions">
                <button type="submit">Create</button>
            </div>
        </form>
    </section>

    <section class="panel">
        <h2>Existing Virtual Channels</h2>
        {#if data.groups.length === 0}
            <p class="muted">No virtual channels yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.groups as g}
                            <tr>
                                <td>
                                    <input name="name" form={`rename-${g.id}`} value={g.name} />
                                </td>
                                <td>
                                    <div class="inline-actions">
                                        <a href={`/admin/virtual-channels/${g.id}`} class="btn btn-secondary">Manage</a>
                                        <form method="post" action="?/rename" id={`rename-${g.id}`} class="inline-form">
                                            <input type="hidden" name="id" value={g.id} />
                                            <button type="submit">Save</button>
                                        </form>
                                        <form method="post" action="?/delete" class="inline-form">
                                            <input type="hidden" name="id" value={g.id} />
                                            <button
                                                type="submit"
                                                class="btn-danger"
                                                on:click={(event) => {
                                                    if (!confirm('Delete this virtual channel?')) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            >
                                                Delete
                                            </button>
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
