<script lang="ts">
    export let data: {
        channels: { id: number; youtube_id: string; title: string }[];
        groups: { id: number; name: string }[];
        assignments: { channel_id: number; group_id: number }[];
    };

    const channelById = new Map(data.channels.map(c => [c.id, c] as const));
    const groupById = new Map(data.groups.map(g => [g.id, g] as const));
</script>

<div class="page stack">
    <section class="panel">
        <h1>Channel ↔ Group Assignments</h1>
        <h2>Add Assignment</h2>
        <form method="post" action="?/add" class="fields">
            <label>
                Channel
                <select name="channel_id" required>
                    <option value="" disabled selected>Select a channel</option>
                    {#each data.channels as c}
                        <option value={c.id}>{c.title}</option>
                    {/each}
                </select>
            </label>
            <label>
                Group
                <select name="group_id" required>
                    <option value="" disabled selected>Select a group</option>
                    {#each data.groups as g}
                        <option value={g.id}>{g.name}</option>
                    {/each}
                </select>
            </label>
            <div class="inline-actions">
                <button type="submit">Add</button>
            </div>
        </form>
    </section>

    <section class="panel">
        <h2>Existing Assignments</h2>
        {#if data.assignments.length === 0}
            <p class="muted">No assignments yet.</p>
        {:else}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Channel</th>
                            <th>Group</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.assignments as a}
                            <tr>
                                <td>{channelById.get(a.channel_id)?.title}</td>
                                <td>{groupById.get(a.group_id)?.name}</td>
                                <td>
                                    <form method="post" action="?/remove" class="inline-form">
                                        <input type="hidden" name="channel_id" value={a.channel_id} />
                                        <input type="hidden" name="group_id" value={a.group_id} />
                                        <button type="submit" class="btn-danger">Remove</button>
                                    </form>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>
