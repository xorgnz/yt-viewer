<script lang="ts">
    import {onMount, onDestroy} from 'svelte';

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
        previousVideoYoutubeId: string | null;
        nextVideoYoutubeId: string | null;
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
    let activeVideoYoutubeId = data.video.youtube_id;
    const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

    $: showWatched = watched || (thresholdReached && !suppressThresholdWatch);

    $: if (data.video.youtube_id !== activeVideoYoutubeId)
    {
        activeVideoYoutubeId = data.video.youtube_id;
        resetForVideoChange(!!data.video.watched);

        if (player && typeof player.cueVideoById === 'function')
        {
            try
            {
                player.cueVideoById(data.video.youtube_id);
            }
            catch
            {
                // Ignore transient player API errors during route-driven video swaps.
            }
        }
    }

    function formatDate(ms: number | null): string
    {
        if (!ms) return '';
        try
        {
            const d = new Date(ms);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        catch
        {
            return '';
        }
    }

    function resetForVideoChange(serverWatched: boolean)
    {
        stopPolling();
        watched = serverWatched;
        thresholdReached = serverWatched;
        thresholdWatchSubmitted = serverWatched;
        suppressThresholdWatch = false;
        showWatched = serverWatched;
        watchMutationPending = false;
        isActivelyPlaying = false;
        elapsedWatchSeconds = 0;
        historySessionCreated = false;
        lastPersistedWatchSeconds = 0;
        lastHistoryActivityAt = null;
    }

    function startPolling()
    {
        stopPolling();
        lastPlaybackTickAt = Date.now();
        pollTimer = setInterval(() =>
        {
            try
            {
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
            }
            catch
            {
                // No-op while the player API is still warming up.
            }
        }, 1000);
    }

    function stopPolling()
    {
        if (pollTimer)
        {
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

        try
        {
            const response = await fetch('?/createHistorySession', {
                method: 'POST',
                body: formData
            });
            if (!response.ok)
            {
                historySessionCreated = false;
                return;
            }
            lastPersistedWatchSeconds = Math.floor(elapsedWatchSeconds);
            lastHistoryActivityAt = Date.now();
        }
        catch
        {
            historySessionCreated = false;
        }
    }

    async function updateHistoryProgress()
    {
        const formData = new FormData();
        formData.set('watchSeconds', String(Math.floor(elapsedWatchSeconds)));

        try
        {
            const response = await fetch('?/updateHistoryProgress', {
                method: 'POST',
                body: formData
            });
            if (response.ok)
            {
                lastPersistedWatchSeconds = Math.floor(elapsedWatchSeconds);
                lastHistoryActivityAt = Date.now();
            }
            else if (response.status === 409)
            {
                elapsedWatchSeconds = 0;
                historySessionCreated = false;
                lastPersistedWatchSeconds = 0;
                lastHistoryActivityAt = null;
            }
        }
        catch
        {
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

        try
        {
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
        }
        catch
        {
            watched = previousWatched;
            thresholdReached = previousThresholdReached;
            suppressThresholdWatch = previousSuppressThresholdWatch;
            thresholdWatchSubmitted = previousThresholdWatchSubmitted;
        }
        finally
        {
            watchMutationPending = false;
        }
    }

    function handleWatchSubmit(event: SubmitEvent)
    {
        event.preventDefault();
        void updateWatchedStatus(showWatched ? 'unwatch' : 'watch');
    }

    onMount(() =>
    {
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
                        onStateChange: (e: any) =>
                        {
                            const YT = (window as any).YT;
                            if (!e || !YT || typeof YT.PlayerState === 'undefined') return;

                            if (e.data === YT.PlayerState.PLAYING)
                            {
                                setPlaybackActive(true);
                                startPolling();
                                return;
                            }

                            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED)
                            {
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
            (window as any).onYouTubeIframeAPIReady = () =>
            {
                createPlayer();
            };
        }

        return () =>
        {
            stopPolling();
            try
            {
                if (player && typeof player.destroy === 'function')
                {
                    player.destroy();
                }
            }
            catch
            {
                // Ignore teardown issues from the YouTube iframe API.
            }
        };
    });

    onDestroy(() =>
    {
        stopPolling();
        try
        {
            if (player && typeof player.destroy === 'function')
            {
                player.destroy();
            }
        }
        catch
        {
            // Ignore teardown issues from the YouTube iframe API.
        }
    });
</script>

<div id="div_viewer_panel" class="page stack panel">
    <div id="div_player_flex_wrapper">
        <div id="div_player_frame">
            {#if data.previousVideoYoutubeId}
                <a id="a_player_nav_prev" href={`/viewer/watch/${data.previousVideoYoutubeId}`}
                   aria-label="Previous video">
                    <svg id="svg_player_nav_prev" viewBox="0 0 24 96" aria-hidden="true" focusable="false">
                        <polyline points="18,8 6,48 18,88"></polyline>
                    </svg>
                </a>
            {:else}
                <span id="a_player_nav_prev" aria-hidden="true"></span>
            {/if}

            <div id="player" title={data.video.title}></div>

            {#if data.nextVideoYoutubeId}
                <a id="a_player_nav_next" href={`/viewer/watch/${data.nextVideoYoutubeId}`} aria-label="Next video">
                    <svg id="svg_player_nav_next" viewBox="0 0 24 96" aria-hidden="true" focusable="false">
                        <polyline points="6,8 18,48 6,88"></polyline>
                    </svg>
                </a>
            {:else}
                <span id="a_player_nav_next" aria-hidden="true"></span>
            {/if}
        </div>
    </div>

    <div id="div_video_meta_panel">
        <div id="div_title_row">
            <h1 id="h1_video_title">{data.video.title}</h1>
            <div id="div_title_meta">
                <a id="a_channel_link"
                   href={`/viewer?channelId=${data.video.channel_id}`}>{data.video.channel_title}</a>
                {#if data.video.published_at}
                    <span id="span_title_separator">|</span>
                    <span id="span_published_date">{formatDate(data.video.published_at)}</span>
                {/if}
            </div>
        </div>

        <div id="div_video_meta">
                    <span id="span_video_badges">
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
        </div>

        <div id="div_watch_actions" class="inline-actions">
            <form id="form_watch" method="POST" action="?/markWatched" class="inline-form"
                  on:submit={handleWatchSubmit}>
                <input type="hidden" name="intent" value={showWatched ? 'unwatch' : 'watch'}/>
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
            <details id="details_description_panel" class="desc">
                <summary>Description</summary>
                <pre>{data.video.description}</pre>
            </details>
        {/if}
    </div>
</div>

<style>
    #div_viewer_panel {
        height: 100%;
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
    }

    #div_player_flex_wrapper {
        width: 100%;
        min-height: 245px;
        min-width: 438px;
        flex: 5 5 auto;
    }

    #div_player_frame {
        --free-width: calc(100cqw - 150px);
        --constrained-width: calc(100cqh * 16 / 9);
        --managed-width: min(var(--free-width), var(--constrained-width));
        --free-height: 100cqh;
        --constrained-height: calc((100cqw - 150px) / 16 * 9);
        --managed-height: min(var(--free-height), var(--constrained-height));
        display: flex;
        height: 100%;
        width: 100%;
        align-items: stretch;
        justify-content: center;
        container-type: size;
    }

    #player {
        width: var(--managed-width);
        height: var(--managed-height);
        display: block;
        aspect-ratio: 16 / 9;
        border: 2px solid #909090;
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
    }

    #a_player_nav_prev,
    #a_player_nav_next {
        width: 75px;
        height: var(--managed-height);
        display: flex;
        z-index: 2;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-sm);
        background-color: rgba(0, 0, 0, 0.25);
        color: var(--text);
        font-weight: 600;
        text-align: center;
    }

    #svg_player_nav_prev,
    #svg_player_nav_next {
        width: 1.8rem;
        color: currentColor;
        stroke: currentColor;
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    #div_video_meta_panel {
        width: 100%;
        min-height: 400px;
        height: 100%;
        flex: 1 1 auto;
        overflow: auto;
        border: 1px solid var(--border);
        padding: 1rem 1.1rem;
        border-radius: var(--radius);
        background-color: var(--bg-panel);
    }

    #div_title_row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
    }

    #h1_video_title {
        margin-bottom: 0;
        color: var(--text);
        font-size: 32px;
        line-height: 1.2;
    }

    #div_title_meta {
        display: inline-flex;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem 0.5rem;
        color: var(--text);
        font-size: 32px;
        font-weight: 700;
        line-height: 1.2;
        text-align: right;
    }

    #a_channel_link {
        color: inherit;
        text-align: inherit;
    }

    #span_title_separator {
        opacity: 0.6;
    }

    #span_published_date {
        color: inherit;
        font-weight: 400;
    }

    #div_video_meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.5rem;
        margin-top: 0.4rem;
        color: var(--text-muted);
        font-size: 0.95rem;
        line-height: 1.5;
    }

    #span_video_badges {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-left: 0.25rem;
    }

    .badge {
        border: 1px solid var(--border);
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        background-color: var(--bg-soft);
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.2;
    }

    .badge.favorite {
        border-color: rgba(210, 153, 34, 0.4);
        background-color: rgba(210, 153, 34, 0.16);
        color: #f3ca78;
    }

    .badge.watched {
        border-color: rgba(47, 158, 68, 0.4);
        background-color: rgba(47, 158, 68, 0.16);
        color: #8dd89f;
    }

    .badge.ignored {
        background-color: rgba(255, 255, 255, 0.06);
        color: var(--text-muted);
    }

    #div_watch_actions {
        margin-bottom: 1rem;
    }

    #details_description_panel summary {
        cursor: pointer;
    }

    #details_description_panel[open] {
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    #details_description_panel pre {
        max-height: 10rem;
        color: var(--text-muted);
        font-family: var(--font-body);
        font-size: 0.95rem;
        line-height: 1.5;
        white-space: pre-wrap;
    }

    @media (max-width: 900px) {
        :global(.app-content) {
            min-height: auto;
        }

        #div_title_row {
            flex-wrap: wrap;
        }

        #div_title_meta {
            width: 100%;
            justify-content: flex-start;
            text-align: left;
        }

        #player {
            width: 100%;
            min-width: 300px;
            min-height: calc(300px / 16 * 9);
            max-width: min(100vw - 40px, (100vh - 520px) * 16 / 9);
            max-height: min(100vh - 520px, (100vw - 40px) * 9 / 16);
        }

        #a_player_nav_prev,
        #a_player_nav_next {
            width: 3.6rem;
            min-width: 3.6rem;
        }

        #div_video_meta_panel {
            min-height: 0;
        }
    }
</style>
