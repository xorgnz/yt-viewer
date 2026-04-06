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
        profileName: string;
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

                const thresholdTime = duration < 120 ? duration * 0.75 : Math.max(0, duration - 30);

                if (!consideredWatched && current >= thresholdTime)
                {
                    consideredWatched = true;
                    if (!data.video.watched)
                    {
                        const form = document.getElementById('watchForm') as HTMLFormElement | null;
                        if (form) form.submit();
                    }
                }
            } catch {
                // No-op while the player API is still warming up.
            }
        }, 1000);
    }

    function stopPolling()
    {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    onMount(() => {
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
                            const YT = (window as any).YT;
                            if (e && YT && typeof YT.PlayerState !== 'undefined' && e.data === YT.PlayerState.PLAYING) {
                                startPolling();
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
            try {
                if (player && typeof player.destroy === 'function') {
                    player.destroy();
                }
            } catch {
                // Ignore teardown issues from the YouTube iframe API.
            }
        };
    });

    onDestroy(() => {
        stopPolling();
        try {
            if (player && typeof player.destroy === 'function') {
                player.destroy();
            }
        } catch {
            // Ignore teardown issues from the YouTube iframe API.
        }
    });
</script>

<div class="page stack">
    <section class="panel">
        <a class="back" href="/viewer">Back to video list</a>

        <h1 class="title">{data.video.title}</h1>
        <div class="meta">
            <span class="channel">Profile: {data.profileName}</span>
            <span class="dot">|</span>
            <span class="channel">{data.video.channel_title}</span>
            {#if data.video.published_at}
                <span class="dot">|</span>
                <span class="date">{formatDate(data.video.published_at)}</span>
            {/if}
            <span class="badges">
                {#if data.video.favorite}
                    <span class="badge favorite">Favorite</span>
                {/if}
                {#if data.video.watched}
                    <span class="badge watched">Watched</span>
                {/if}
                {#if data.video.ignored}
                    <span class="badge ignored">Ignored</span>
                {/if}
            </span>
            <span class="dot">|</span>
            <a class="channel-link" href={`/viewer?channelId=${data.video.channel_id}`}>More from this channel</a>
            <span class="dot">|</span>
            <a class="yt-link" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${data.video.youtube_id}`}>Open on YouTube</a>
        </div>

        <div class="player-wrap">
            <div id="player" class="player" title={data.video.title}></div>
        </div>

        <div class="inline-actions action-bar">
            <form id="watchForm" method="POST" action="?/markWatched" class="inline-form">
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
                <span class="badge watched watch-indicator" aria-live="polite">Watched</span>
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
    </section>
</div>

<style>
    .back {
        display: inline-block;
        margin-bottom: 1rem;
    }

    .title {
        margin-bottom: 0.5rem;
        font-size: 1.5rem;
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.5rem;
        color: var(--text-muted);
        font-size: 0.95rem;
    }

    .dot {
        opacity: 0.6;
    }

    .badges {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-left: 0.25rem;
    }

    .badge {
        border-radius: 999px;
        padding: 0.1rem 0.5rem;
        font-size: 0.8rem;
        border: 1px solid var(--border);
        background: var(--bg-soft);
        color: var(--text);
    }

    .badge.favorite {
        background: rgba(210, 153, 34, 0.16);
        border-color: rgba(210, 153, 34, 0.4);
        color: #f3ca78;
    }

    .badge.watched {
        background: rgba(47, 158, 68, 0.16);
        border-color: rgba(47, 158, 68, 0.4);
        color: #8dd89f;
    }

    .badge.ignored {
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-muted);
    }

    .player-wrap {
        position: relative;
        width: 100%;
        max-width: 960px;
        aspect-ratio: 16 / 9;
        margin: 1rem 0;
    }

    .player {
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
    }

    .action-bar {
        margin-bottom: 1rem;
    }

    .desc summary {
        cursor: pointer;
    }

    .desc pre {
        white-space: pre-wrap;
        font-family: var(--font-body);
        font-size: 0.95rem;
        color: var(--text-muted);
    }
</style>
