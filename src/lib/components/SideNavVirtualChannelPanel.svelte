<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { SideNavVirtualChannelPanelPresenter } from '$lib/components/SideNavVirtualChannelPanelPresenter';
    import type { SideNavVirtualChannelViewModel } from '$lib/components/SideNavVirtualChannelPanelViewModel';

    export let virtualChannel: SideNavVirtualChannelViewModel | null;
    let liveVirtualChannel: SideNavVirtualChannelViewModel | null = virtualChannel;

    $: liveVirtualChannel = virtualChannel;
    $: presenter = liveVirtualChannel
        ? new SideNavVirtualChannelPanelPresenter(liveVirtualChannel)
        : null;

    onMount(() => {
        const onPlaybackTick = (event: Event) => {
            const detail = (event as CustomEvent<{ virtualChannelId: number; deltaSeconds: number }>).detail;
            if (!liveVirtualChannel || !detail || detail.virtualChannelId !== liveVirtualChannel.id) {
                return;
            }

            if (liveVirtualChannel.dailyTimerMax == null || liveVirtualChannel.timerState === 'capped') {
                return;
            }

            const deltaSeconds = Math.max(0, detail.deltaSeconds || 0);
            const nextUsage = Math.max(0, liveVirtualChannel.timerUsageSeconds + deltaSeconds);
            const nextRemaining = Math.max(0, (liveVirtualChannel.timerRemainingSeconds ?? 0) - deltaSeconds);
            const nextState = nextRemaining === 0 ? 'capped' : 'available';

            liveVirtualChannel = {
                ...liveVirtualChannel,
                timerUsageSeconds: nextUsage,
                timerRemainingSeconds: nextRemaining,
                timerState: nextState
            };
        };

        window.addEventListener('viewer:playback-tick', onPlaybackTick as EventListener);
        return () => {
            window.removeEventListener('viewer:playback-tick', onPlaybackTick as EventListener);
        };
    });
</script>

<section class="nav-virtual-channel" aria-label="Active virtual channel">
    <div class="nav-virtual-channel-label">Virtual Channel</div>
    {#if liveVirtualChannel && presenter}
        <div class="nav-virtual-channel-name">{liveVirtualChannel.name}</div>
        <div class="nav-virtual-channel-meta">
            <div class="nav-virtual-channel-status">{presenter.getTimerModeLabel()}</div>
            <div class="nav-virtual-channel-usage">{presenter.getTimerUsageLabel()}</div>
            <div class="nav-virtual-channel-usage">{presenter.getTimerRemainingLabel()}</div>
        </div>
        <form method="POST" action="/viewer/debug/reset-virtual-channel-timer" class="nav-virtual-channel-debug-form">
            <input type="hidden" name="virtualChannelId" value={liveVirtualChannel.id} />
            <input type="hidden" name="returnTo" value={$page.url.pathname + $page.url.search} />
            <button type="submit" class="nav-virtual-channel-debug-button">Reset Debug</button>
        </form>
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

    .nav-virtual-channel-debug-form {
        margin-top: var(--space-2);
    }

    .nav-virtual-channel-debug-button {
        width: 100%;
        min-height: 2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-sm);
        padding: 0.35rem 0.6rem;
        background: rgba(255, 255, 255, 0.08);
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.2;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
