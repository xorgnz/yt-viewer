<script lang="ts">
    export let data: {
        channels: { id: number; youtube_id: string; title: string }[];
        groups: { id: number; name: string }[];
        assignments: { channel_id: number; group_id: number }[];
    };

    const channelById = new Map(data.channels.map(c => [c.id, c] as const));
    const groupById = new Map(data.groups.map(g => [g.id, g] as const));
</script>

<h1>Channel ↔ Group Assignments</h1>

<section>
    <h2>Add Assignment</h2>
    <form method="post" action="?/add">
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
        <button type="submit">Add</button>
    </form>
</section>

<section style="margin-top: 2rem;">
    <h2>Existing Assignments</h2>
    {#if data.assignments.length === 0}
        <p>No assignments yet.</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>Group</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {#each data.assignments as a}
                    <tr>
                        <td>{channelById.get(a.channel_id)?.title}</td>
                        <td>{groupById.get(a.group_id)?.name}</td>
                        <td>
                            <form method="post" action="?/remove">
                                <input type="hidden" name="channel_id" value={a.channel_id} />
                                <input type="hidden" name="group_id" value={a.group_id} />
                                <button type="submit">Remove</button>
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</section>

<style>
    h1 { margin-bottom: 0.5rem; }
    form { display: flex; gap: 0.5rem; align-items: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; }
    th { text-align: left; background: #f7f7f7; }
    section + section { margin-top: 2rem; }
    label { display: flex; flex-direction: column; font-size: 0.9rem; }
    select { min-width: 220px; }
    button { padding: 0.4rem 0.8rem; }
</style>
