<script lang="ts">
    import VideoCard from '$lib/components/VideoCard.svelte';
    import type {
        ViewerVideo
    } from '$lib/viewer/types';
    import type {
        ViewerSelectionFlagKind,
        ViewerSelectionFlagValue
    } from '$lib/viewerSelection';

    export let videos: ViewerVideo[] = [];
    export let selectedVideoIds: number[] = [];
    export let onCardMouseDown: ((event: MouseEvent, videoId: number) => void) | null = null;
    export let onCardClick: ((event: MouseEvent | KeyboardEvent, videoId: number) => void) | null = null;
    export let onToggleFlag:
        ((videoId: number, kind: ViewerSelectionFlagKind, value: ViewerSelectionFlagValue) => void | Promise<void>) | null
        = null;
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
        grid-template-columns: repeat(auto-fit, minmax(clamp(250px, 18vw, 320px), 1fr));
        gap: 1rem;
    }
</style>
