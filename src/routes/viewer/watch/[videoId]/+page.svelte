<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    export let data: {
        video: {
            id: number;
            youtube_id: string;
            channel_id: number;
            title: string;
            description: string;
            published_at: number | null;
            duration_seconds: number | null;
            thumbnail_url: string | null;
            channel_title: string;
            channel_youtube_id: string;
            watched: number;
            favorite: number;
            ignored: number;
        };
        profileId: number;
        profileKey: string;
    };

    let consideredWatched = !!data.video.watched;
    let pollTimer: any = null;
    let player: any = null;

    function formatDate(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toLocaleString();
        } catch {
            return '';
        }
    }

    function startPolling()
    {
        stopPolling();
        pollTimer = setInterval(() => {
            try {
                if (!player || typeof player.getCurrentTime !== 'function') return;
                const current: number = Number(player.getCurrentTime());
                let duration: number = Number(typeof player.getDuration === 'function' ? player.getDuration() : (data.video.duration_seconds || 0));
                if (!duration || !Number.isFinite(duration) || duration <= 0) return;

                // PRD rule (line 36): automatically mark watched when reaching last 30s,
                // or last 25% if the video is under 2 minutes (< 120s).
                const thresholdTime = duration < 120 ? duration * 0.75 : Math.max(0, duration - 30);

                if (!consideredWatched && current >= thresholdTime)
                {
                    consideredWatched = true; // immediately update UI state
                    // Auto-submit only if not already persisted as watched
                    if (!data.video.watched)
                    {
                        const form = document.getElementById('watchForm') as HTMLFormElement | null;
                        if (form) form.submit();
                    }
                }
            } catch { /* noop */ }
        }, 1000);
    }

    function stopPolling()
    {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    onMount(() => {
        // Load YouTube IFrame API and create player to observe progress
        function createPlayer()
        {
            if ((window as any).YT && (window as any).YT.Player)
            {
                player = new (window as any).YT.Player('player', {
                    videoId: data.video.youtube_id,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        rel: 0,
                        modestbranding: 1
                    },
                    events: {
                        onReady: () => { startPolling(); },
                        onStateChange: (e: any) => {
                            // Only poll during playback/buffering; otherwise still OK to keep polling timer
                            const YT = (window as any).YT;
                            if (e && YT && typeof YT.PlayerState !== 'undefined') {
                                if (e.data === YT.PlayerState.PLAYING) startPolling();
                            }
                        }
                    }
                });
                return true;
            }
            return false;
        }

        if (!createPlayer())
        {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.body.appendChild(tag);
            (window as any).onYouTubeIframeAPIReady = () => {
                createPlayer();
            };
        }

        return () => {
            stopPolling();
            try { if (player && typeof player.destroy === 'function') player.destroy(); } catch { /* noop */ }
        };
    });

    onDestroy(() => {
        stopPolling();
        try { if (player && typeof player.destroy === 'function') player.destroy(); } catch { /* noop */ }
    });
</script>

<a class="back" href={`/viewer?profile=${encodeURIComponent(data.profileKey)}`}>← Back to video list</a>

<h1 class="title">{data.video.title}</h1>
<div class="meta">
    <span class="channel">{data.video.channel_title}</span>
    {#if data.video.published_at}
        <span class="dot">•</span>
        <span class="date">{formatDate(data.video.published_at)}</span>
    {/if}
    <span class="badges">
        {#if data.video.favorite}
            <span class="badge favorite">★ Favorite</span>
        {/if}
        {#if data.video.watched}
            <span class="badge watched">Watched</span>
        {/if}
        {#if data.video.ignored}
            <span class="badge ignored">Ignored</span>
        {/if}
    </span>
    <span class="dot">•</span>
    <a class="channel-link" href={`/viewer?channelId=${data.video.channel_id}&profile=${encodeURIComponent(data.profileKey)}`}>More from this channel</a>
    <span class="dot">•</span>
    <a class="yt-link" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${data.video.youtube_id}`}>Open on YouTube</a>
    
</div>

<div class="player-wrap">
    <div id="player" class="player" title={data.video.title}></div>
    <!-- The YT IFrame API will inject an iframe into #player -->
    </div>

<div class="actions">
    <form id="watchForm" method="POST" action={`?/markWatched&profile=${encodeURIComponent(data.profileKey)}`}>
        <input type="hidden" name="intent" value={(consideredWatched || data.video.watched) ? 'unwatch' : 'watch'} />
        <button type="submit" aria-pressed={consideredWatched || !!data.video.watched}>
            {#if consideredWatched || data.video.watched}
                Clear watch status
            {:else}
                Mark as Watched
            {/if}
        </button>
    </form>
    {#if consideredWatched || data.video.watched}
        <span class="badge watched watch-indicator" aria-live="polite">✓ Watched</span>
    {/if}
    {#if data.video.favorite}
        <span class="hint">This video is in your Favorites.</span>
    {/if}
</div>

{#if data.video.description}
<details class="desc">
    <summary>Description</summary>
    <pre>{data.video.description}</pre>
    </details>
{/if}

<style>
    .back { display: inline-block; margin: .5rem 0 1rem; text-decoration: none; }
    .title { margin: 0.25rem 0 0.5rem; font-size: 1.25rem; }
    .meta { color: #555; font-size: 0.9rem; display: flex; align-items: center; flex-wrap: wrap; gap: .25rem .5rem; }
    .dot { opacity: .5; }
    .badge { border-radius: 3px; padding: 0 .25rem; font-size: .8rem; border: 1px solid #ddd; }
    .badge.favorite { color: #c37a00; border-color: #ffd27a; background: #fff7e0; }
    .badge.watched { color: #0a7a00; border-color: #9ce19c; background: #eefaea; }
    .badge.ignored { color: #666; border-color: #ccc; background: #f4f4f4; }
    .player-wrap { position: relative; width: 100%; max-width: 960px; aspect-ratio: 16 / 9; margin: 1rem 0; }
    .player { width: 100%; height: 100%; border: none; border-radius: 8px; box-shadow: 0 1px 6px rgba(0,0,0,.12); }
    .desc summary { cursor: pointer; }
    .desc pre { white-space: pre-wrap; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; font-size: .95rem; }
    .actions { display: flex; align-items: center; gap: .5rem; margin: .25rem 0 1rem; }
    .actions form { display: inline; }
    .actions button {
        font-size: .9rem;
        padding: .35rem .65rem;
        border: 1px solid #333;
        background: #444;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
    }
    .actions button:hover { background: #3a3a3a; }
    .actions button:disabled {
        opacity: .8;
        cursor: default;
    }
    .watch-indicator { margin-left: .25rem; }
    .actions .hint { color: #666; font-size: .85rem; }
</style>
