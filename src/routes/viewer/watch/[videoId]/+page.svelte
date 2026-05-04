<script lang="ts">
    import VideoCard from '$lib/components/VideoCard.svelte';
    import {onMount, onDestroy} from 'svelte';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import { viewerPageState } from '$lib/viewer/pageState';
    import type { ViewerFilters, ViewerVirtualChannel, ViewerVideo } from '$lib/viewer/types';

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
        recommendations: ViewerVideo[];
        navigationFilters: ViewerFilters;
        profileId: number;
        profileKey: string;
        profileName: string;
        previousVideoYoutubeId: string | null;
        nextVideoYoutubeId: string | null;
        currentVirtualChannelId: number | null;
        activeVirtualChannel: ViewerVirtualChannel | null;
        playbackBlockedMessage: string | null;
    };

    let watched = !!data.video.watched;
    let favorite = !!data.video.favorite;
    let ignored = !!data.video.ignored;
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
    let timerPlaybackBlocked = false;
    let timerStatusMessage: string | null = data.playbackBlockedMessage;
    let activeVideoYoutubeId = data.video.youtube_id;
    let recommendations = data.recommendations;
    const videoMutationService = new VideoMutationService({
        toggleFlagAction: '?/toggleFlag'
    });
    const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

    $: showWatched = watched || (thresholdReached && !suppressThresholdWatch);
    $: recommendations = data.recommendations;
    $: timerStatusMessage = data.playbackBlockedMessage;
    $: timerPlaybackBlocked = !!timerStatusMessage;

    $: if (data.video.youtube_id !== activeVideoYoutubeId)
    {
        activeVideoYoutubeId = data.video.youtube_id;
        resetForVideoChange(!!data.video.watched, data.playbackBlockedMessage);

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

    function buildWatchHref(videoYoutubeId: string | null): string
    {
        if (!videoYoutubeId) {
            return '#';
        }

        return viewerPageState.buildViewerWatchHref(data.navigationFilters, videoYoutubeId);
    }

    function resetForVideoChange(serverWatched: boolean, playbackBlockedMessage: string | null)
    {
        stopPolling();
        watched = serverWatched;
        favorite = !!data.video.favorite;
        ignored = !!data.video.ignored;
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
        timerStatusMessage = playbackBlockedMessage;
        timerPlaybackBlocked = !!playbackBlockedMessage;
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
        if (timerPlaybackBlocked)
        {
            isActivelyPlaying = false;
            lastPlaybackTickAt = null;
            return;
        }

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

    function handleTimerCapReached(message = 'Daily timer limit reached for this virtual channel.')
    {
        timerStatusMessage = message;
        timerPlaybackBlocked = true;
        historySessionCreated = false;
        isActivelyPlaying = false;
        lastHistoryActivityAt = null;
        stopPolling();

        try
        {
            if (player && typeof player.pauseVideo === 'function')
            {
                player.pauseVideo();
            }
        }
        catch
        {
            // Ignore transient player API failures while stopping capped playback.
        }
    }

    async function createHistorySession()
    {
        const formData = new FormData();
        formData.set('watchSeconds', String(Math.floor(elapsedWatchSeconds)));
        if (data.currentVirtualChannelId != null) {
            formData.set('virtualChannelId', String(data.currentVirtualChannelId));
        }

        try
        {
            const response = await fetch('?/createHistorySession', {
                method: 'POST',
                body: formData
            });
            if (!response.ok)
            {
                historySessionCreated = false;

                if (response.headers.get('x-viewer-timer-state') === 'capped') {
                    handleTimerCapReached();
                }

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
        if (data.currentVirtualChannelId != null) {
            formData.set('virtualChannelId', String(data.currentVirtualChannelId));
        }

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
            else if (response.headers.get('x-viewer-timer-state') === 'capped')
            {
                handleTimerCapReached();
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

    async function handleMetaFlagToggle(kind: 'favorite' | 'ignored' | 'watched')
    {
        if (kind === 'watched')
        {
            await updateWatchedStatus(showWatched ? 'unwatch' : 'watch');
            return;
        }

        const nextValue = kind === 'favorite'
            ? (favorite ? 0 : 1)
            : (ignored ? 0 : 1);

        try
        {
            const updatedVideo = await videoMutationService.toggleVideoFlag(data.video, kind, nextValue);

            if (!updatedVideo) {
                return;
            }

            if (kind === 'favorite') {
                favorite = !!nextValue;
                return;
            }

            ignored = !!nextValue;
        }
        catch
        {
            // Ignore transient toggle failures and keep current flag display.
        }
    }

    function handleRecommendationVideoChange(video: ViewerVideo)
    {
        recommendations = recommendations.map((item) => item.id === video.id ? video : item);
    }

    onMount(() =>
    {
        if (timerPlaybackBlocked)
        {
            return () => {
                stopPolling();
            };
        }

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
                                if (timerPlaybackBlocked)
                                {
                                    handleTimerCapReached();
                                    return;
                                }

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

<div
    id="div_viewer_panel"
    class="page panel"
    class:viewer-favorite={favorite}
    class:viewer-watched={showWatched}
    class:viewer-ignored={ignored}
    class:viewer-favorite-watched={favorite && showWatched}
>
    <div id="div_player_flex_wrapper">
        <div id="div_player_frame">
            {#if data.previousVideoYoutubeId}
                <a id="a_player_nav_prev" href={buildWatchHref(data.previousVideoYoutubeId)}
                   aria-label="Previous video">
                    <svg id="svg_player_nav_prev" viewBox="0 0 24 96" aria-hidden="true" focusable="false">
                        <polyline points="18,8 6,48 18,88"></polyline>
                    </svg>
                </a>
            {:else}
                <span id="a_player_nav_prev" aria-hidden="true"></span>
            {/if}

            {#if timerStatusMessage}
                <div id="div_player_status" aria-live="polite">
                    <p>{timerStatusMessage}</p>
                </div>
            {/if}

            <div id="player" title={data.video.title}></div>

            {#if data.nextVideoYoutubeId}
                <a id="a_player_nav_next" href={buildWatchHref(data.nextVideoYoutubeId)} aria-label="Next video">
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
                <div id="div_title_flag_actions">
                    <button
                        type="button"
                        class="icon favorite"
                        class:active={favorite}
                        aria-pressed={favorite}
                        title={favorite ? 'Clear favorite' : 'Mark favorite'}
                        on:click={() => void handleMetaFlagToggle('favorite')}
                    >
                        <span class="icon-glyph" aria-hidden="true">&#9733;</span>
                        <span class="sr-only">{favorite ? 'Clear favorite' : 'Mark favorite'}</span>
                    </button>
                    <button
                        type="button"
                        class="icon watched"
                        class:active={showWatched}
                        aria-pressed={showWatched}
                        title={showWatched ? 'Clear watched' : 'Mark watched'}
                        on:click={() => void handleMetaFlagToggle('watched')}
                        disabled={watchMutationPending}
                    >
                        <span class="icon-glyph" aria-hidden="true">&#10003;</span>
                        <span class="sr-only">{showWatched ? 'Clear watched' : 'Mark watched'}</span>
                    </button>
                    <button
                        type="button"
                        class="icon ignored"
                        class:active={ignored}
                        aria-pressed={ignored}
                        title={ignored ? 'Clear ignored' : 'Mark ignored'}
                        on:click={() => void handleMetaFlagToggle('ignored')}
                    >
                        <span class="icon-glyph" aria-hidden="true">&#10005;</span>
                        <span class="sr-only">{ignored ? 'Clear ignored' : 'Mark ignored'}</span>
                    </button>
                </div>
                <a id="a_channel_link"
                   href={`/viewer?channelId=${data.video.channel_id}`}>{data.video.channel_title}</a>
                {#if data.video.published_at}
                    <span id="span_title_separator">|</span>
                    <span id="span_published_date">{formatDate(data.video.published_at)}</span>
                {/if}
            </div>
        </div>

    </div>

    <section id="section_recommendations_panel">
        {#if recommendations.length === 0}
            <p class="muted">No recommendations are available for this video yet.</p>
        {:else}
            <div id="div_recommendations_grid">
                {#each recommendations as recommendation}
                    <VideoCard
                        video={recommendation}
                        watchHref={buildWatchHref(recommendation.youtube_id)}
                        {videoMutationService}
                        on:videochange={(event) => handleRecommendationVideoChange(event.detail)}
                    />
                {/each}
            </div>
        {/if}
    </section>

    {#if data.video.description}
        <section id="section_description_panel">
            <div id="div_description_header">
                <h2 id="h2_description">Description</h2>
            </div>
            <pre id="pre_video_description">{data.video.description}</pre>
        </section>
    {/if}
</div>

<style>
    #div_viewer_panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        border: 1px solid var(--border);
    }

    #div_viewer_panel.viewer-watched {
        border-color: rgba(67, 160, 71, 0.86);
        background:
            linear-gradient(90deg, rgb(14, 44, 24), rgb(36, 96, 50));
        box-shadow: inset 0 1px 0 rgba(168, 236, 174, 0.26);
    }

    #div_viewer_panel.viewer-favorite {
        border-color: rgba(227, 179, 65, 0.9);
        background:
            linear-gradient(90deg, rgb(170, 112, 0), rgb(48, 34, 10));
        box-shadow: inset 0 1px 0 rgba(255, 232, 160, 0.28);
    }

    #div_viewer_panel.viewer-favorite-watched {
        border-color: rgba(122, 198, 214, 0.95);
        background:
            linear-gradient(90deg, rgb(170, 112, 0) 20%, rgba(30, 94, 54, 0.96) 100%);
        box-shadow:
            inset 0 1px 0 rgba(255, 238, 170, 0.34),
            inset 0 -1px 0 rgba(150, 230, 236, 0.3),
            0 0 0 1px rgba(95, 195, 221, 0.34);
    }

    #div_viewer_panel.viewer-ignored {
        border-color: rgba(229, 115, 115, 0.9);
        background:
            linear-gradient(90deg, rgb(124, 36, 48), rgb(52, 16, 22));
        box-shadow: inset 0 1px 0 rgba(248, 176, 176, 0.26);
    }

    #div_player_flex_wrapper {
        --player-flex-wrapper-height: 66vh;
        width: 100%;
        min-width: 438px;
        min-height: 245px;
        max-height: var(--player-flex-wrapper-height);
        display: flex;
    }

    #div_player_frame {
        --free-width: calc(100% - 150px);
        --constrained-width: calc(var(--player-flex-wrapper-height) * 16 / 9);
        --managed-width: min(var(--free-width), var(--constrained-width));
        flex: 1;
        display: flex;
        position: relative;
        align-items: stretch;
        justify-content: center;
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

    #player {
        width: var(--managed-width);
        max-height: var(--player-flex-wrapper-height);
        display: block;
        aspect-ratio: 16 / 9;
        border: 2px solid #909090;
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
    }

    #div_player_status {
        width: var(--managed-width);
        max-height: var(--player-flex-wrapper-height);
        display: flex;
        position: absolute;
        z-index: 3;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(229, 115, 115, 0.92);
        border-radius: var(--radius);
        padding: 1.5rem;
        box-sizing: border-box;
        background-color: rgba(24, 24, 24, 0.92);
        color: var(--text);
        text-align: center;
    }

    #div_player_status p {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.4;
    }

    #svg_player_nav_prev,
    #svg_player_nav_next {
        width: 1.8rem;
        vertical-align: middle;
        color: currentColor;
        stroke: currentColor;
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    #div_video_meta_panel {
        display: block;
        border: 1px solid var(--border);
        padding: 1rem 1.1rem;
        border-radius: var(--radius);
        box-sizing: border-box;
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

    #div_title_flag_actions {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-right: 0.45rem;
    }

    #div_title_flag_actions .icon {
        width: 1.9rem;
        height: 1.9rem;
        min-width: 1.9rem;
        min-height: 1.9rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(184, 184, 184, 0.75);
        border-radius: 999px;
        padding: 0;
        background: linear-gradient(180deg, rgba(46, 46, 46, 0.96), rgba(24, 24, 24, 0.98));
        color: rgba(132, 138, 146, 0.82);
        cursor: pointer;
        box-shadow: 0 0.3rem 0.75rem rgba(0, 0, 0, 0.38);
        font-size: 0.98rem;
        font-weight: 800;
        line-height: 1;
    }

    #div_title_flag_actions .icon:hover {
        border-color: rgba(214, 214, 214, 0.8);
        background: linear-gradient(180deg, rgba(68, 68, 68, 0.98), rgba(34, 34, 34, 0.98));
    }

    #div_title_flag_actions .icon:disabled {
        opacity: 0.7;
        cursor: default;
    }

    #div_title_flag_actions .icon .icon-glyph {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1em;
        height: 1em;
        transform: translateY(-1px);
    }

    #div_title_flag_actions .icon.active.favorite {
        border-color: rgba(255, 232, 162, 0.95);
        background: linear-gradient(180deg, rgba(227, 179, 65, 0.98), rgba(199, 156, 37, 0.98));
        color: #161616;
    }

    #div_title_flag_actions .icon.active.watched {
        border-color: rgba(180, 234, 185, 0.92);
        background: linear-gradient(180deg, rgba(46, 125, 50, 0.98), rgba(31, 90, 35, 0.98));
        color: #f4fff4;
    }

    #div_title_flag_actions .icon.active.ignored {
        border-color: rgba(255, 190, 198, 0.92);
        background: linear-gradient(180deg, rgba(176, 0, 32, 0.98), rgba(122, 0, 21, 0.98));
        color: #fff;
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

    #section_recommendations_panel {
        border: 1px solid var(--border);
        padding: 1rem 1.1rem;
        border-radius: var(--radius);
        box-sizing: border-box;
        background-color: var(--bg-panel);
    }

    #section_description_panel {
        border: 1px solid var(--border);
        padding: 1rem 1.1rem;
        border-radius: var(--radius);
        box-sizing: border-box;
        background-color: var(--bg-panel);
    }

    #div_description_header {
        margin-bottom: 1rem;
    }

    #h2_description {
        margin-bottom: 0;
    }

    #pre_video_description {
        margin: 0;
        color: var(--text-muted);
        font-family: var(--font-body);
        font-size: 0.95rem;
        line-height: 1.5;
        white-space: pre-wrap;
    }

    #div_recommendations_grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 320px));
        justify-content: center;
        align-items: start;
        gap: 1rem;
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

        #a_player_nav_prev,
        #a_player_nav_next {
            width: 3.6rem;
            min-width: 3.6rem;
        }

        #player {
            width: 100%;
            height: 100%;
            min-height: calc(300px / 16 * 9);
            min-width: 300px;
            max-width: min(100vw - 40px, (100vh - 520px) * 16 / 9);
            max-height: min(100vh - 520px, (100vw - 40px) * 9 / 16);
        }

        #div_video_meta_panel {
            min-height: 0;
        }
    }
</style>
<!-- apply-patch-anchor - do not delete -->
