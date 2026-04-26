<script lang="ts">
    import VideoCard from '$lib/components/VideoCard.svelte';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import type {
        ViewerCardClickHandler,
        ViewerCardMouseDownHandler,
        ViewerVideo
    } from '$lib/viewer/types';

    export let videos: ViewerVideo[] = [];
    export let selectedVideoIds: number[] = [];
    export let buildVideoWatchHref: ((video: ViewerVideo) => string) | null = null;
    export let videoMutationService: VideoMutationService | null = null;
    export let onCardMouseDown: ViewerCardMouseDownHandler | null = null;
    export let onCardClick: ViewerCardClickHandler | null = null;
    export let onVideoChange: ((video: ViewerVideo) => void) | null = null;
</script>

<section class="panel viewer-results-panel">
    {#if videos.length === 0}
        <p class="muted">No videos match these filters.</p>
    {:else}
        <div class="grid">
            {#each videos as video}
                <VideoCard
                    {video}
                    watchHref={buildVideoWatchHref ? buildVideoWatchHref(video) : null}
                    {videoMutationService}
                    isSelected={selectedVideoIds.includes(video.id)}
                    onCardMouseDown={onCardMouseDown}
                    onCardClick={onCardClick}
                    on:videochange={(event) => onVideoChange?.(event.detail)}
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
<!-- apply-patch-anchor - do not delete -->
