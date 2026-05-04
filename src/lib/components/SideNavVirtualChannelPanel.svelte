<script lang="ts">
    import { SideNavVirtualChannelPanelPresenter } from '$lib/components/SideNavVirtualChannelPanelPresenter';
    import type { SideNavVirtualChannelViewModel } from '$lib/components/SideNavVirtualChannelPanelViewModel';

    export let virtualChannel: SideNavVirtualChannelViewModel | null;
    $: presenter = virtualChannel
        ? new SideNavVirtualChannelPanelPresenter(virtualChannel)
        : null;
</script>

<section class="nav-virtual-channel" aria-label="Active virtual channel">
    <div class="nav-virtual-channel-label">Virtual Channel</div>
    {#if virtualChannel && presenter}
        <div class="nav-virtual-channel-name">{virtualChannel.name}</div>
        <div class="nav-virtual-channel-meta">
            <div class="nav-virtual-channel-status">{presenter.getTimerModeLabel()}</div>
            <div class="nav-virtual-channel-usage">{presenter.getTimerUsageLabel()}</div>
        </div>
    {:else}
        <div class="nav-virtual-channel-name nav-virtual-channel-name-muted">No channel selected</div>
    {/if}
</section>

<style>
    .nav-virtual-channel {
        margin: var(--space-4) var(--space-2) 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.8rem 0.9rem;
        background: rgba(255, 255, 255, 0.05);
        box-shadow: var(--shadow-sm);
    }

    :global(.app-layout[data-profile-tone="adult"]) .nav-virtual-channel {
        border-color: rgba(196, 123, 200, 0.4);
        background: linear-gradient(180deg, rgba(111, 43, 114, 0.18), rgba(20, 22, 27, 0.94));
    }

    :global(.app-layout[data-profile-tone="child"]) .nav-virtual-channel {
        border-color: rgba(255, 191, 126, 0.42);
        background: linear-gradient(180deg, rgba(227, 123, 44, 0.18), rgba(20, 22, 27, 0.94));
    }

    .nav-virtual-channel-label {
        color: var(--text-soft);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .nav-virtual-channel-name {
        margin-top: 0.2rem;
        color: var(--text);
        font-size: 0.98rem;
        font-weight: 600;
        line-height: 1.3;
    }

    .nav-virtual-channel-name-muted {
        color: var(--text-muted);
        font-weight: 500;
    }

    .nav-virtual-channel-meta {
        margin-top: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .nav-virtual-channel-status,
    .nav-virtual-channel-usage {
        color: var(--text-muted);
        font-size: 0.84rem;
        line-height: 1.35;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
