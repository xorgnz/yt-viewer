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

<section
    class="nav-virtual-channel"
    class:nav-virtual-channel-capped={liveVirtualChannel?.timerState === 'capped'}
    aria-label="Active virtual channel"
>
    {#if liveVirtualChannel && presenter}
        <div class="nav-virtual-channel-name">{liveVirtualChannel.name}</div>
        <div class="nav-virtual-channel-meta">
            {#if presenter.getTimerModeLabel()}
                <div class="nav-virtual-channel-status">{presenter.getTimerModeLabel()}</div>
            {/if}
            <div class="nav-virtual-channel-timer-row">
                <span class="nav-virtual-channel-consumed">{presenter.getConsumedDurationLabel()}</span>
                {#if presenter.getTotalDurationLabel()}
                    <span class="nav-virtual-channel-total">/ {presenter.getTotalDurationLabel()}</span>
                {/if}
            </div>
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

    :global(.app-layout[data-profile-tone="adult"]) .nav-virtual-channel.nav-virtual-channel-capped,
    :global(.app-layout[data-profile-tone="child"]) .nav-virtual-channel.nav-virtual-channel-capped,
    .nav-virtual-channel.nav-virtual-channel-capped {
        border-color: rgba(214, 86, 86, 0.72);
        background: linear-gradient(180deg, rgba(120, 22, 22, 0.56), rgba(36, 10, 12, 0.96));
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

    .nav-virtual-channel-status {
        color: var(--text-muted);
        font-size: 0.84rem;
        line-height: 1.35;
    }

    .nav-virtual-channel-timer-row {
        min-height: 2.4rem;
        display: flex;
        align-items: baseline;
        gap: 0.28rem;
        color: var(--text);
        line-height: 1;
        white-space: nowrap;
    }

    .nav-virtual-channel-consumed {
        flex: 0 1 auto;
        min-width: 0;
        font-size: clamp(1.45rem, 5.4vh, 2.1rem);
        font-weight: 700;
    }

    .nav-virtual-channel-total {
        flex: 0 0 auto;
        color: var(--text-muted);
        font-size: clamp(0.8rem, 2.5vh, 1rem);
        font-weight: 600;
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
