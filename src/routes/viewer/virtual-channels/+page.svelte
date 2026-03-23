<script lang="ts">
    export let data: {
        groups: Array<{ id: number; name: string }>;
        profileKey: string;
    };

    const profileKey = data.profileKey || 'default';
</script>

<div class="page stack">
    <section class="panel">
        <h1>Choose a Virtual Channel</h1>
        {#if data.groups.length === 0}
            <p class="muted">No virtual channels yet. Ask an admin to create some in Admin -> Virtual Channels.</p>
        {:else}
            <div class="grid">
                {#each data.groups as g}
                    <a class="group" href={`/viewer?${new URLSearchParams({ groupId: String(g.id), profile: profileKey }).toString()}`}>
                        <div class="name">{g.name}</div>
                        <div class="hint">View videos from this virtual channel</div>
                    </a>
                {/each}
            </div>
        {/if}
    </section>
</div>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.9rem;
    }

    .group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.9rem;
        color: var(--text);
        background: var(--bg-panel);
        box-shadow: var(--shadow-sm);
        transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease;
    }

    .group:hover {
        transform: translateY(-1px);
        background: var(--bg-elevated);
        border-color: var(--border-strong);
        color: var(--text);
    }

    .name {
        font-weight: 600;
        font-size: 1.05rem;
    }
</style>
