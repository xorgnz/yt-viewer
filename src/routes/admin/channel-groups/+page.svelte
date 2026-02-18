<script lang="ts">
    export let data: { groups: { id: number; name: string }[] };
    let newName = '';
</script>

<h1>Channel Groups</h1>

<section style="margin: 1rem 0; padding: 1rem; border: 1px solid #ddd;">
    <h2>Create Group</h2>
    <form method="post" action="?/create">
        <label>
            Name
            <input name="name" bind:value={newName} required />
        </label>
        <button type="submit">Create</button>
    </form>
</section>

<section>
    <h2>Existing Groups</h2>
    {#if data.groups.length === 0}
        <p>No groups yet.</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th style="text-align:left;">Name</th>
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
                            <form method="post" action="?/rename" id={`rename-${g.id}`} style="display:inline;">
                                <input type="hidden" name="id" value={g.id} />
                                <button type="submit">Save</button>
                            </form>
                            <form method="post" action="?/delete" style="display:inline; margin-left: .5rem;">
                                <input type="hidden" name="id" value={g.id} />
                                <button
                                    type="submit"
                                    on:click={(event) => {
                                        if (!confirm('Delete this group?')) {
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 0.5rem; }
        input { width: 100%; box-sizing: border-box; }
        h2 { margin: 0 0 .5rem 0; }
    </style>
</section>
