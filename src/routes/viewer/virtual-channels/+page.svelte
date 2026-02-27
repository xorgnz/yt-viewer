<script lang="ts">
    export let data: {
        groups: Array<{ id: number; name: string }>;
        profileKey: string;
    };

    const profileKey = data.profileKey || 'default';
</script>

<h1>Choose a Virtual Channel</h1>

{#if data.groups.length === 0}
    <p>No virtual channels yet. Ask an admin to create some in Admin → Virtual Channels.</p>
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

<style>
    h1 { margin: 0 0 1rem 0; }
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: .9rem;
    }
    .group {
        display: flex;
        flex-direction: column;
        border: 1px solid #333;
        border-radius: 6px;
        padding: .9rem;
        color: #fff;
        text-decoration: none;
        background: #1e1e1e;
        transition: transform .1s ease, background .15s ease, border-color .15s ease;
    }
    .group:hover { transform: translateY(-1px); background: #222; border-color: #444; }
    .name { font-weight: 600; font-size: 1.05rem; margin-bottom: .25rem; }
    .hint { color: #aaa; font-size: .9rem; }
    </style>
