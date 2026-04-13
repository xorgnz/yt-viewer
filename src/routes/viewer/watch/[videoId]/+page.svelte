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

    let watched = !!data.video.watched;
    let thresholdReached = watched;
    let suppressThresholdWatch = false;
    let thresholdWatchSubmitted = watched;
    let showWatched = watched;
    let pollTimer: any = null;
    let player: any = null;
    let isActivelyPlaying = false;
    let lastPlaybackTickAt: number | null = null;
    let elapsedWatchSeconds = 0;
    let historySessionCreated = false;
    let lastPersistedWatchSeconds = 0;
    let lastHistoryActivityAt: number | null = null;
    let watchMutationPending = false;
    const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

    $: showWatched = watched || (thresholdReached && !suppressThresholdWatch);

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
        lastPlaybackTickAt = Date.now();
        pollTimer = setInterval(() => {
            try {
                if (!player || typeof player.getCurrentTime !== 'function') return;

                const now = Date.now();

                // Accumulate wall-clock watch time so replayed segments still count.
                if (isActivelyPlaying && lastPlaybackTickAt != null)
                {
                    const deltaSeconds = Math.max(0, (now - lastPlaybackTickAt) / 1000);
                    elapsedWatchSeconds += deltaSeconds;
                }
                lastPlaybackTickAt = now;

                const current: number = Number(player.getCurrentTime());
                let duration: number = Number(typeof player.getDuration === 'function' ? player.getDuration() : (data.video.duration_seconds || 0));
                if (!duration || !Number.isFinite(duration) || duration <= 0) return;

                if (!historySessionCreated && elapsedWatchSeconds > 5)
                {
                    historySessionCreated = true;
                    createHistorySession();
                }

                if (historySessionCreated && (elapsedWatchSeconds - lastPersistedWatchSeconds) >= 10)
                {
                    updateHistoryProgress();
                }

                const thresholdTime = duration < 120 ? duration * 0.75 : Math.max(0, duration - 30);
                const hasReachedThreshold = current >= thresholdTime;

                if (!hasReachedThreshold)
                {
                    thresholdReached = false;
                    thresholdWatchSubmitted = watched;
                    suppressThresholdWatch = false;
                }
                else
                {
                    thresholdReached = true;

                    if (!watched && !thresholdWatchSubmitted && !watchMutationPending && !suppressThresholdWatch)
                    {
                        thresholdWatchSubmitted = true;
                        void updateWatchedStatus('watch');
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
        lastPlaybackTickAt = null;
    }

    function setPlaybackActive(active: boolean)
    {
        if (active && lastHistoryActivityAt != null && (Date.now() - lastHistoryActivityAt) > HISTORY_SESSION_GAP_MS)
        {
            elapsedWatchSeconds = 0;
            historySessionCreated = false;
            lastPersistedWatchSeconds = 0;
            lastHistoryActivityAt = null;
        }

        isActivelyPlaying = active;
        lastPlaybackTickAt = Date.now();
    }

    async function createHistorySession()
    {
        const formData = new FormData();
        formData.set('watchSeconds', String(Math.floor(elapsedWatchSeconds)));

        try {
            const response = await fetch('?/createHistorySession', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                historySessionCreated = false;
                return;
            }
            lastPersistedWatchSeconds = Math.floor(elapsedWatchSeconds);
            lastHistoryActivityAt = Date.now();
        } catch {
            historySessionCreated = false;
        }
    }

    async function updateHistoryProgress()
    {
        const formData = new FormData();
        formData.set('watchSeconds', String(Math.floor(elapsedWatchSeconds)));

        try {
            const response = await fetch('?/updateHistoryProgress', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                lastPersistedWatchSeconds = Math.floor(elapsedWatchSeconds);
                lastHistoryActivityAt = Date.now();
            } else if (response.status === 409) {
                elapsedWatchSeconds = 0;
                historySessionCreated = false;
                lastPersistedWatchSeconds = 0;
                lastHistoryActivityAt = null;
            }
        } catch {
            // Ignore transient progress-update failures and retry later.
        }
    }

    async function updateWatchedStatus(intent: 'watch' | 'unwatch')
    {
        if (watchMutationPending)
        {
            return;
        }

        const previousWatched = watched;
        const previousThresholdReached = thresholdReached;
        const previousSuppressThresholdWatch = suppressThresholdWatch;
        const previousThresholdWatchSubmitted = thresholdWatchSubmitted;

        watchMutationPending = true;

        if (intent === 'watch')
        {
            watched = true;
            suppressThresholdWatch = false;
            thresholdWatchSubmitted = true;
        }
        else
        {
            watched = false;
            thresholdReached = false;
            thresholdWatchSubmitted = false;
            suppressThresholdWatch = true;
        }

        const formData = new FormData();
        formData.set('intent', intent);

        try {
            const response = await fetch('?/markWatched', {
                method: 'POST',
                body: formData
            });

            if (!response.ok)
            {
                watched = previousWatched;
                thresholdReached = previousThresholdReached;
                suppressThresholdWatch = previousSuppressThresholdWatch;
                thresholdWatchSubmitted = previousThresholdWatchSubmitted;
            }
        } catch {
            watched = previousWatched;
            thresholdReached = previousThresholdReached;
            suppressThresholdWatch = previousSuppressThresholdWatch;
            thresholdWatchSubmitted = previousThresholdWatchSubmitted;
        } finally {
            watchMutationPending = false;
        }
    }

    function handleWatchSubmit(event: SubmitEvent)
    {
        event.preventDefault();
        void updateWatchedStatus(showWatched ? 'unwatch' : 'watch');
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
                            if (!e || !YT || typeof YT.PlayerState === 'undefined') return;

                            if (e.data === YT.PlayerState.PLAYING) {
                                setPlaybackActive(true);
                                startPolling();
                                return;
                            }

                            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                                setPlaybackActive(false);
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

<div class="page stack watch-page">
    <section class="panel watch-panel">
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
                {#if watched}
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

        <div class="player-slot">
            <div class="player-wrap">
                <div id="player" class="player" title={data.video.title}></div>
            </div>
        </div>

        <div class="inline-actions action-bar">
            <form id="watchForm" method="POST" action="?/markWatched" class="inline-form" on:submit={handleWatchSubmit}>
                <input type="hidden" name="intent" value={showWatched ? 'unwatch' : 'watch'} />
                <button type="submit" aria-pressed={showWatched} disabled={watchMutationPending}>
                    {#if showWatched}
                        Clear watch status
                    {:else}
                        Mark as Watched
                    {/if}
                </button>
            </form>
            {#if showWatched}
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
    :global(.app-content) {
        display: flex;
        min-height: 100vh;
    }

    .watch-page {
        flex: 1;
        min-height: 0;
    }

    .watch-panel {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
    }

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

    .player-slot {
        display: grid;
        flex: 1;
        min-height: 0;
        place-items: center;
        margin: 1rem 0;
        container-type: size;
    }

    .player-wrap {
        position: relative;
        width: 100%;
        max-height: 100%;
        aspect-ratio: 16 / 9;
    }

    @supports (width: 1cqw) {
        .player-wrap {
            width: min(100cqw, calc(100cqh * 16 / 9));
        }
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

    @media (max-width: 900px) {
        :global(.app-content) {
            min-height: auto;
        }

        .player-wrap {
            width: 100%;
        }
    }
</style>
