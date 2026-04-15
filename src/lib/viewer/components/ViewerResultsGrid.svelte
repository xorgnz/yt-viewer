<script lang="ts">
    import VideoCard from '$lib/components/VideoCard.svelte';
    import type {
        ViewerFlagToggleHandler
    } from '$lib/viewer/display';
    import type {
        ViewerCardClickHandler,
        ViewerCardMouseDownHandler,
        ViewerVideo
    } from '$lib/viewer/types';

    export let videos: ViewerVideo[] = [];
    export let selectedVideoIds: number[] = [];
    export let onCardMouseDown: ViewerCardMouseDownHandler | null = null;
    export let onCardClick: ViewerCardClickHandler | null = null;
    export let onToggleFlag: ViewerFlagToggleHandler | null = null;
</script>

<section class="panel viewer-results-panel">
    {#if videos.length === 0}
        <p class="muted">No videos match these filters.</p>
    {:else}
        <div class="grid">
            {#each videos as video}
                <VideoCard
                    {video}
                    isSelected={selectedVideoIds.includes(video.id)}
                    onCardMouseDown={onCardMouseDown}
                    onCardClick={onCardClick}
                    onToggleFlag={onToggleFlag}
                />
            {/each}
        </div>
    {/if}
</section>

<style>
    .viewer-results-panel {
        padding: 0.6rem;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 320px));
        justify-content: start;
        align-items: start;
        gap: 1rem;
    }
</style>
