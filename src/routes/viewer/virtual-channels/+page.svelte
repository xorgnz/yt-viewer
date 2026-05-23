<script lang="ts">
    import type { ViewerVirtualChannelTimerFields } from '$lib/viewer/ViewerVirtualChannelTimer';

    export let data: {
        virtualChannels: ViewerVirtualChannelTimerFields[];
        profileKey: string;
    };
</script>

<div class="page stack">
    <section class="panel">
        <h1>Choose a Virtual Channel</h1>
        {#if data.virtualChannels.length === 0}
            <p class="muted">No virtual channels yet. Ask an admin to create some in Admin -> Virtual Channels.</p>
        {:else}
            <div class="grid">
                {#each data.virtualChannels as g}
                    {#if g.timerState === 'capped'}
                        <div class="virtual-channel-card virtual-channel-card-capped" aria-disabled="true">
                            <div class="name">{g.virtualChannel.name}</div>
                            <div class="hint">Daily timer limit reached</div>
                        </div>
                    {:else}
                        <a class="virtual-channel-card" href={`/viewer?${new URLSearchParams({ virtualChannelId: String(g.virtualChannel.id) }).toString()}`}>
                            <div class="name">{g.virtualChannel.name}</div>
                            <div class="hint">View videos from this virtual channel</div>
                        </a>
                    {/if}
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

    .virtual-channel-card {
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

    .virtual-channel-card.virtual-channel-card-capped {
        opacity: 0.55;
        cursor: default;
        box-shadow: none;
    }

    .virtual-channel-card:hover {
        transform: translateY(-1px);
        background: var(--bg-elevated);
        border-color: var(--border-strong);
        color: var(--text);
    }

    .virtual-channel-card.virtual-channel-card-capped:hover {
        transform: none;
        background: var(--bg-panel);
        border-color: var(--border);
    }

    .name {
        font-weight: 600;
        font-size: 1.05rem;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
