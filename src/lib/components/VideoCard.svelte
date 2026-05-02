<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import ThumbnailImage from '$lib/components/ThumbnailImage.svelte';
    import {
        ViewerVideoDisplayPresenter
    } from '$lib/viewer/display';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import type { ViewerSelectionFlagKind, ViewerSelectionFlagValue } from '$lib/viewer/selection/types';
    import type {
        ViewerCardClickHandler,
        ViewerCardMouseDownHandler,
        ViewerVideo
    } from '$lib/viewer/types';

    export let video: ViewerVideo;
    export let watchHref: string | null = null;
    export let disabled = false;
    export let isSelected = false;
    export let videoMutationService: VideoMutationService | null = null;
    export let onCardClick: ViewerCardClickHandler | null = null;
    export let onCardMouseDown: ViewerCardMouseDownHandler | null = null;
    const dispatch = createEventDispatcher<{
        videochange: ViewerVideo;
    }>();
    let currentVideo = video;
    let flagMutationPending = false;

    let presenter = new ViewerVideoDisplayPresenter(currentVideo);
    let displayState = presenter.getState();

    $: currentVideo = video;
    $: presenter = new ViewerVideoDisplayPresenter(currentVideo);
    $: displayState = presenter.getState();
    $: resolvedWatchHref = disabled ? null : (watchHref || displayState.watchHref);

    async function handleFlagClick(
        event: MouseEvent,
        kind: ViewerSelectionFlagKind,
        value: ViewerSelectionFlagValue
    ): Promise<void>
    {
        event.preventDefault();
        event.stopPropagation();

        if (disabled || flagMutationPending || !videoMutationService) {
            return;
        }

        flagMutationPending = true;

        try
        {
            const updatedVideo = await videoMutationService.toggleVideoFlag(currentVideo, kind, value);

            if (!updatedVideo) {
                return;
            }

            currentVideo = updatedVideo;
            dispatch('videochange', updatedVideo);
        }
        finally
        {
            flagMutationPending = false;
        }
    }

    function handleCardActivation(event: MouseEvent | KeyboardEvent): void
    {
        if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        onCardClick?.(event, video.id);
    }

    function handleCardPointerDown(event: MouseEvent): void
    {
        if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        onCardMouseDown?.(event, video.id);
    }
</script>

<div
    class="card"
    class:card-disabled={disabled}
    class:card-ignored={displayState.isIgnored}
    class:card-favorite-watched={displayState.isFavoriteWatched}
    class:card-favorite={displayState.isFavoriteOnly}
    class:card-watched={displayState.isWatchedOnly}
    class:card-selected={isSelected}
    data-selected={isSelected ? '1' : '0'}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-pressed={isSelected}
    aria-disabled={disabled}
    on:mousedown={handleCardPointerDown}
    on:click={handleCardActivation}
    on:keydown={handleCardActivation}
    title={currentVideo.title}
>
    <a
        class="thumb"
        href={resolvedWatchHref}
        aria-label={displayState.openLabel}
        tabindex={disabled ? -1 : undefined}
        aria-disabled={disabled}
        on:click|preventDefault={disabled ? () => undefined : undefined}
    >
        {#if isSelected}
            <span class="selection-indicator" aria-hidden="true">&#10003;</span>
        {/if}
        {#if currentVideo.thumbnail_url}
            <ThumbnailImage src={currentVideo.thumbnail_url} alt={currentVideo.title} className="img-thumb" />
        {:else}
            <div class="placeholder"></div>
        {/if}
    </a>
    <div class="meta">
        <a
            class="title"
            href={resolvedWatchHref}
            tabindex={disabled ? -1 : undefined}
            aria-disabled={disabled}
            on:click|preventDefault={disabled ? () => undefined : undefined}
        >
            {currentVideo.title}
        </a>
        <div class="channel-row">
            <div class="actions">
                <button
                    type="button"
                    class="icon favorite"
                    class:active={!!currentVideo.favorite}
                    aria-pressed={!!currentVideo.favorite}
                    disabled={disabled || flagMutationPending || !videoMutationService}
                    title={presenter.getToggleTitle('favorite')}
                    on:click={(event) => handleFlagClick(event, 'favorite', presenter.getNextFlagValue('favorite'))}
                >
                    <span class="icon-glyph" aria-hidden="true">&#9733;</span>
                    <span class="sr-only">{presenter.getToggleLabel('favorite')}</span>
                </button>
                <button
                    type="button"
                    class="icon watched"
                    class:active={!!currentVideo.watched}
                    aria-pressed={!!currentVideo.watched}
                    disabled={disabled || flagMutationPending || !videoMutationService}
                    title={presenter.getToggleTitle('watched')}
                    on:click={(event) => handleFlagClick(event, 'watched', presenter.getNextFlagValue('watched'))}
                >
                    <span class="icon-glyph" aria-hidden="true">&#10003;</span>
                    <span class="sr-only">{presenter.getToggleLabel('watched')}</span>
                </button>
                <button
                    type="button"
                    class="icon ignored"
                    class:active={!!currentVideo.ignored}
                    aria-pressed={!!currentVideo.ignored}
                    disabled={disabled || flagMutationPending || !videoMutationService}
                    title={presenter.getToggleTitle('ignored')}
                    on:click={(event) => handleFlagClick(event, 'ignored', presenter.getNextFlagValue('ignored'))}
                >
                    <span class="icon-glyph" aria-hidden="true">&#10005;</span>
                    <span class="sr-only">{presenter.getToggleLabel('ignored')}</span>
                </button>
            </div>
            <div class="chan">{currentVideo.channel_title}</div>
        </div>
        <div class="pub">{displayState.publishedDate}</div>
    </div>
</div>

<style>
    .card {
        display: flex;
        flex-direction: column;
        height: 320px;
        border: 1px solid #333;
        border-radius: 6px;
        overflow: hidden;
        color: #fff;
        background:
            linear-gradient(180deg, rgba(36, 36, 36, 0.96), rgba(24, 24, 24, 0.98));
        position: relative;
        transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }

    .card.card-watched {
        border-color: rgba(67, 160, 71, 0.86);
        background:
            linear-gradient(90deg, rgb(14, 44, 24), rgb(36, 96, 50));
        box-shadow: inset 0 1px 0 rgba(168, 236, 174, 0.26);
    }

    .card.card-favorite {
        border-color: rgba(227, 179, 65, 0.9);
        background:
            linear-gradient(90deg, rgb(170, 112, 0), rgb(48, 34, 10));
        box-shadow: inset 0 1px 0 rgba(255, 232, 160, 0.28);
    }

    .card.card-favorite-watched {
        border-color: rgba(122, 198, 214, 0.95);
        background:
            linear-gradient(90deg, rgb(170, 112, 0) 20%, rgba(30, 94, 54, 0.96) 100%);
        box-shadow:
            inset 0 1px 0 rgba(255, 238, 170, 0.34),
            inset 0 -1px 0 rgba(150, 230, 236, 0.3),
            0 0 0 1px rgba(95, 195, 221, 0.34);
    }

    .card.card-ignored {
        border-color: rgba(229, 115, 115, 0.9);
        background:
            linear-gradient(90deg, rgb(124, 36, 48), rgb(52, 16, 22));
        box-shadow: inset 0 1px 0 rgba(248, 176, 176, 0.26);
    }

    .card.card-selected {
        border-color: #3b82f6;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    .card.card-selected.card-watched {
        border-color: #4fba7a;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    .card.card-selected.card-favorite {
        border-color: #69a9f5;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    .card.card-selected.card-favorite-watched {
        border-color: #72b8d0;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    .card.card-selected.card-ignored {
        border-color: rgba(229, 115, 115, 0.9);
        box-shadow:
            inset 0 1px 0 rgba(239, 154, 154, 0.16),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    .card.card-disabled {
        opacity: 0.52;
    }

    .card a {
        color: inherit;
        text-decoration: none;
    }

    .card.card-disabled a {
        cursor: default;
    }

    .actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .actions button {
        width: 1.9rem;
        height: 1.9rem;
        min-width: 1.9rem;
        min-height: 1.9rem;
        padding: 0;
        gap: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(184, 184, 184, 0.75);
        background: linear-gradient(180deg, rgba(46, 46, 46, 0.96), rgba(24, 24, 24, 0.98));
        color: rgba(132, 138, 146, 0.82);
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 0.3rem 0.75rem rgba(0, 0, 0, 0.38);
        transition: transform .1s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
        font-size: 0.98rem;
        font-weight: 800;
        line-height: 1;
    }

    .actions button .icon-glyph {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1em;
        height: 1em;
        line-height: 1;
        flex: 0 0 auto;
        transform: translateY(-1px);
    }

    .actions button:hover {
        background: linear-gradient(180deg, rgba(68, 68, 68, 0.98), rgba(34, 34, 34, 0.98));
        border-color: rgba(214, 214, 214, 0.8);
        transform: translateY(-1px);
        box-shadow: 0 0.4rem 0.95rem rgba(0, 0, 0, 0.42);
    }

    .actions button.active.favorite {
        background: linear-gradient(180deg, rgba(227, 179, 65, 0.98), rgba(199, 156, 37, 0.98));
        color: #161616;
        border-color: rgba(255, 232, 162, 0.95);
        box-shadow: 0 0.35rem 0.9rem rgba(106, 76, 6, 0.38);
    }

    .actions button.watched.active {
        background: linear-gradient(180deg, rgba(46, 125, 50, 0.98), rgba(31, 90, 35, 0.98));
        border-color: rgba(180, 234, 185, 0.92);
        color: #f4fff4;
        box-shadow: 0 0.35rem 0.9rem rgba(12, 57, 23, 0.4);
    }

    .actions button.ignored.active {
        background: linear-gradient(180deg, rgba(176, 0, 32, 0.98), rgba(122, 0, 21, 0.98));
        border-color: rgba(255, 190, 198, 0.92);
        color: #fff;
        box-shadow: 0 0.35rem 0.9rem rgba(72, 0, 13, 0.42);
    }

    .actions button.icon {
        padding: 0;
    }

    .channel-row {
        display: flex;
        align-items: center;
        gap: 0.45rem;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
    }

    .thumb {
        position: relative;
        width: 100%;
        height: 180px;
        background: #111;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .thumb :global(.img-thumb) {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        display: block;
    }

    .thumb .placeholder {
        width: 100%;
        height: 100%;
        background: repeating-linear-gradient(45deg, #2a2a2a, #2a2a2a 10px, #242424 10px, #242424 20px);
    }

    .selection-indicator {
        position: absolute;
        top: 0.55rem;
        right: 0.55rem;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.9rem;
        height: 1.9rem;
        border: 2px solid rgba(186, 230, 253, 0.95);
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(59, 130, 246, 0.98), rgba(29, 78, 216, 0.98));
        color: #eff6ff;
        font-size: 1rem;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 0.35rem 0.9rem rgba(8, 47, 73, 0.45);
    }

    .meta {
        padding: .65rem .65rem .25rem;
    }

    .title {
        display: -webkit-box;
        font-weight: 600;
        font-size: 1.05rem;
        margin-bottom: .35rem;
        overflow: hidden;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    .chan {
        color: #bbb;
        font-size: .9rem;
    }

    .pub {
        color: #999;
        font-size: .85rem;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
