<script lang="ts">
    import type {
        BulkActionFeedback
    } from '$lib/viewer/types';
    import type {
        ViewerSelectionControlState,
        ViewerSelectionFlagKind
    } from '$lib/viewer/selection/types';

    export let hasActiveSelection = false;
    export let selectedCount = 0;
    export let offPageSelectedCount = 0;
    export let bulkActionPending = false;
    export let bulkActionFeedback: BulkActionFeedback | null = null;
    export let watchedControlState: ViewerSelectionControlState = 'unchecked';
    export let favoriteControlState: ViewerSelectionControlState = 'unchecked';
    export let ignoredControlState: ViewerSelectionControlState = 'unchecked';
    export let onBulkUndo: () => void | Promise<void> = () => undefined;
    export let onBulkFlagToggle:
        (kind: ViewerSelectionFlagKind, controlState: ViewerSelectionControlState) => void | Promise<void>
        = () => undefined;

    function getGlyph(controlState: ViewerSelectionControlState): string
    {
        if (controlState === 'checked') {
            return '\u2713';
        }

        if (controlState === 'mixed') {
            return '\u25A0';
        }

        return '';
    }
</script>

<div class="bulk-action-slot" class:is-empty={!hasActiveSelection}>
    <div
        class="bulk-action-bar"
        class:is-hidden={!hasActiveSelection}
        role="status"
        aria-live="polite"
        aria-hidden={!hasActiveSelection}
    >
        <div class="bulk-action-copy">
            <span>{bulkActionFeedback?.message ?? `${selectedCount} ${selectedCount === 1 ? 'video selected' : 'videos selected'}`}</span>
            {#if offPageSelectedCount > 0}
                <span class="bulk-action-note">
                    {offPageSelectedCount} {offPageSelectedCount === 1 ? 'selected video is' : 'selected videos are'} on other pages.
                </span>
            {/if}
        </div>
        <div class="bulk-action-controls-wrap">
            <div class="bulk-action-undo-slot">
                <button
                    type="button"
                    class="bulk-action-undo"
                    class:is-hidden={!bulkActionFeedback?.undo}
                    aria-hidden={!bulkActionFeedback?.undo}
                    tabindex={!bulkActionFeedback?.undo ? -1 : 0}
                    disabled={!bulkActionFeedback?.undo || bulkActionPending}
                    on:click={() => void onBulkUndo()}
                >
                    Undo
                </button>
            </div>

            <div class="bulk-action-controls" role="group" aria-label="Bulk selection flags">
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={watchedControlState}
                    disabled={bulkActionPending}
                    on:click={() => void onBulkFlagToggle('watched', watchedControlState)}
                >
                    <span class="bulk-flag-box" data-state={watchedControlState}>
                        {getGlyph(watchedControlState)}
                    </span>
                    <span>Watched</span>
                </button>
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={favoriteControlState}
                    disabled={bulkActionPending}
                    on:click={() => void onBulkFlagToggle('favorite', favoriteControlState)}
                >
                    <span class="bulk-flag-box" data-state={favoriteControlState}>
                        {getGlyph(favoriteControlState)}
                    </span>
                    <span>Favorite</span>
                </button>
                <button
                    type="button"
                    class="bulk-flag-control"
                    data-state={ignoredControlState}
                    disabled={bulkActionPending}
                    on:click={() => void onBulkFlagToggle('ignored', ignoredControlState)}
                >
                    <span class="bulk-flag-box" data-state={ignoredControlState}>
                        {getGlyph(ignoredControlState)}
                    </span>
                    <span>Ignored</span>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .bulk-action-slot {
        position: fixed;
        top: 0.75rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1200;
        width: min(calc(100% - 1rem), 54rem);
        min-height: 0;
        pointer-events: none;
    }

    .bulk-action-slot.is-empty {
        pointer-events: none;
    }

    .bulk-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.85rem;
        width: 100%;
        min-height: 3.1rem;
        padding: 0.45rem 0.85rem;
        border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
        border-radius: var(--radius);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--accent) 16%, var(--bg-soft)), var(--bg-soft));
        box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.12);
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        pointer-events: auto;
    }

    .bulk-action-bar.is-hidden {
        visibility: hidden;
        pointer-events: none;
    }

    .bulk-action-copy {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.6rem;
        min-height: 1.9rem;
        min-width: 0;
        white-space: nowrap;
    }

    .bulk-action-copy span {
        color: var(--text-muted);
        font-size: 0.88rem;
    }

    .bulk-action-note {
        color: color-mix(in srgb, var(--accent) 72%, white);
        font-weight: 600;
    }

    .bulk-action-controls-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.55rem;
        flex: 0 1 auto;
        min-width: 0;
    }

    .bulk-action-undo-slot {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        width: 4.8rem;
        min-width: 4.8rem;
    }

    .bulk-action-undo {
        min-height: 1.65rem;
        width: 4.8rem;
        padding: 0.2rem 0.55rem;
        border: 1px solid currentColor;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-weight: 700;
        box-sizing: border-box;
    }

    .bulk-action-undo.is-hidden {
        visibility: hidden;
        pointer-events: none;
    }

    .bulk-action-undo:disabled {
        opacity: 0.65;
        cursor: wait;
    }

    .bulk-action-controls {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.45rem;
        align-items: center;
        justify-content: flex-end;
        white-space: nowrap;
    }

    .bulk-flag-control {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-height: 2rem;
        padding: 0.3rem 0.65rem;
        border: 1px solid color-mix(in srgb, var(--border) 75%, var(--accent));
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: #24303d;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        font-size: 0.88rem;
    }

    .bulk-flag-control span {
        color: inherit;
    }

    .bulk-flag-control:hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
        transform: translateY(-1px);
    }

    .bulk-flag-control:disabled {
        opacity: 0.65;
        cursor: wait;
    }

    .bulk-flag-control[data-state='checked'] {
        background: color-mix(in srgb, var(--accent) 18%, white);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }

    .bulk-flag-control[data-state='mixed'] {
        background: color-mix(in srgb, var(--accent) 12%, white);
        border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    }

    .bulk-flag-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.1rem;
        height: 1.1rem;
        border: 2px solid color-mix(in srgb, var(--accent) 65%, var(--border));
        border-radius: 0.28rem;
        background: white;
        color: var(--accent);
        font-size: 0.82rem;
        font-weight: 800;
        line-height: 1;
    }

    .bulk-flag-box[data-state='checked'] {
        background: color-mix(in srgb, var(--accent) 80%, white);
        color: white;
    }

    .bulk-flag-box[data-state='mixed'] {
        background: color-mix(in srgb, var(--accent) 32%, white);
        color: var(--accent);
    }

    @media (max-width: 900px) {
        .bulk-action-bar {
            width: 100%;
        }
    }
</style>
<!-- apply-patch-anchor - do not delete -->