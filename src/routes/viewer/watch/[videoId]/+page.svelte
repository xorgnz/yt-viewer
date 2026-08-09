<script lang="ts">
    import VideoCard from '$lib/components/VideoCard.svelte';
    import { Video } from '$lib/entities/video';
    import type { VideoFields } from '$lib/entities/video';
    import {onMount, onDestroy} from 'svelte';
    import type { ViewerFilters } from '$lib/viewer/ViewerFilters';
    import { ViewerPageNavigation } from '$lib/viewer/ViewerPageNavigation';
    import { VideoMutationService } from '$lib/viewer/VideoMutationService';
    import {
        ViewerVirtualChannelTimer,
        type ViewerVirtualChannelTimerSFO
    } from '$lib/viewer/ViewerVirtualChannelTimer';
    import {
        ViewerSelectionFlagKind
    } from '$lib/viewer/selection/types';

    export let data: {
        video: VideoFields;
        recommendations: VideoFields[];
        navigationFilters: ViewerFilters;
        profileId: string | number;
        profileKey: string;
        profileName: string;
        previousVideoYoutubeId: string | null;
        nextVideoYoutubeId: string | null;
        currentVirtualChannelId: string | number | null;
        activeVirtualChannelTimer: ViewerVirtualChannelTimerSFO | null;
        playbackBlockedMessage: string | null;
        activeHistorySessionWatchSecondsBaseline: number;
        activeHistorySessionLastUpdatedAt: number | null;
        resumePositionSeconds: number | null;
    };

    let currentVideo = new Video(data.video);
    let watched = !!currentVideo.watched;
    let favorite = !!currentVideo.favorite;
    let ignored = !!currentVideo.ignored;
    let thresholdReached = watched;
    let suppressThresholdWatch = false;
    let thresholdWatchSubmitted = watched;
    let showWatched = watched;
    let pollTimer: any = null;
    let player: any = null;
    let isActivelyPlaying = false;
    let lastPlaybackTickAt: number | null = null;
    let elapsedWatchSeconds = 0;
    let historySessionCreated = (data.activeHistorySessionLastUpdatedAt ?? null) != null
        && (data.activeHistorySessionWatchSecondsBaseline ?? 0) > 0;
    let historySessionCreatePending = false;
    let historyProgressUpdatePending = false;
    let lastPersistedWatchSeconds = data.activeHistorySessionWatchSecondsBaseline ?? 0;
    let lastHistoryActivityAt: number | null = data.activeHistorySessionLastUpdatedAt ?? null;
    let watchMutationPending = false;
    let timerPlaybackBlocked = false;
    let timerStatusMessage: string | null = data.playbackBlockedMessage;
    let activeVideoYoutubeId = String(currentVideo.id);
    let resumeSeekAppliedVideoId: string | null = null;
    let activeVirtualChannelId = data.currentVirtualChannelId;
    let activeVirtualChannelUsageBaselineSeconds = data.activeVirtualChannelTimer?.timerUsageSeconds ?? 0;
    let activeHistorySessionWatchSecondsBaseline = data.activeHistorySessionWatchSecondsBaseline ?? 0;
    let localActiveVirtualChannel = data.activeVirtualChannelTimer == null
        ? null
        : ViewerVirtualChannelTimer.deserialize(data.activeVirtualChannelTimer);
    let recommendations = data.recommendations.map((video) => new Video(video));
    let pageNavigation = new ViewerPageNavigation(data.navigationFilters);
    let lastDebugEvent = 'init';
    let lastDebugResponse = 'n/a';
    const videoMutationService = new VideoMutationService({
        toggleFlagAction: '?/toggleFlag'
    });
    const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;
    const HISTORY_SESSION_CREATE_THRESHOLD_SECONDS = 1;
    const HISTORY_SESSION_UPDATE_INTERVAL_SECONDS = 1;

    $: showWatched = watched || (thresholdReached && !suppressThresholdWatch);
    $: currentVideo = new Video(data.video);
    $: recommendations = data.recommendations.map((video) => new Video(video));
    $: pageNavigation = new ViewerPageNavigation(data.navigationFilters);
    $: timerStatusMessage = data.playbackBlockedMessage;
    $: timerPlaybackBlocked = !!timerStatusMessage;

    $: if (String(currentVideo.id) !== activeVideoYoutubeId)
    {
        const previousVirtualChannelId = activeVirtualChannelId;
        const previousUsageSeconds = previousVirtualChannelId == null
            ? 0
            : getLocalVirtualChannelUsageSeconds();
        const nextVirtualChannelId = data.currentVirtualChannelId;
        const nextRouteUsageSeconds = data.activeVirtualChannelTimer?.timerUsageSeconds ?? 0;
        const nextUsageBaselineSeconds = previousVirtualChannelId != null && nextVirtualChannelId === previousVirtualChannelId
            ? Math.max(nextRouteUsageSeconds, previousUsageSeconds)
            : nextRouteUsageSeconds;

        lastDebugEvent = `route-change: flush ${activeVideoYoutubeId}`;
        flushPendingHistory(activeVideoYoutubeId, false, previousVirtualChannelId);
        activeVideoYoutubeId = String(currentVideo.id);
        resetForVideoChange(
            !!currentVideo.watched,
            data.playbackBlockedMessage,
            nextVirtualChannelId,
            nextUsageBaselineSeconds,
            data.activeHistorySessionWatchSecondsBaseline ?? 0,
            data.activeHistorySessionLastUpdatedAt ?? null
        );

        if (player && typeof player.cueVideoById === 'function')
        {
            try
            {
                player.cueVideoById(String(data.video.id));
                seekToResumePositionIfNeeded();
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

        return pageNavigation.buildWatchHref(videoYoutubeId);
    }

    function resetForVideoChange(
        serverWatched: boolean,
        playbackBlockedMessage: string | null,
        virtualChannelId: string | number | null,
        usageBaselineSeconds: number,
        historySessionWatchSecondsBaseline: number,
        historySessionLastUpdatedAt: number | null
    )
    {
        lastDebugEvent = `resetForVideoChange: ${currentVideo.id}`;
        stopPolling();
        watched = serverWatched;
        favorite = !!currentVideo.favorite;
        ignored = !!currentVideo.ignored;
        thresholdReached = serverWatched;
        thresholdWatchSubmitted = serverWatched;
        suppressThresholdWatch = false;
        showWatched = serverWatched;
        watchMutationPending = false;
        isActivelyPlaying = false;
        elapsedWatchSeconds = 0;
        historySessionCreated = historySessionLastUpdatedAt != null && historySessionWatchSecondsBaseline > 0;
        historySessionCreatePending = false;
        historyProgressUpdatePending = false;
        lastPersistedWatchSeconds = historySessionWatchSecondsBaseline;
        lastHistoryActivityAt = historySessionLastUpdatedAt;
        timerStatusMessage = playbackBlockedMessage;
        timerPlaybackBlocked = !!playbackBlockedMessage;
        activeVirtualChannelId = virtualChannelId;
        activeVirtualChannelUsageBaselineSeconds = usageBaselineSeconds;
        activeHistorySessionWatchSecondsBaseline = historySessionWatchSecondsBaseline;
        resumeSeekAppliedVideoId = null;
        localActiveVirtualChannel = data.activeVirtualChannelTimer == null
            ? null
            : ViewerVirtualChannelTimer.deserialize({
                ...data.activeVirtualChannelTimer,
                timerUsageSeconds: usageBaselineSeconds
            });
    }

    function getLocalVirtualChannelUsageSeconds(): number
    {
        return activeVirtualChannelUsageBaselineSeconds + Math.floor(elapsedWatchSeconds);
    }

    function getCurrentHistorySessionWatchSeconds(): number
    {
        return activeHistorySessionWatchSecondsBaseline + Math.floor(elapsedWatchSeconds);
    }

    function getCurrentPlaybackPositionSeconds(): number | null
    {
        try
        {
            if (!player || typeof player.getCurrentTime !== 'function') {
                return null;
            }

            const currentPositionSeconds = Number(player.getCurrentTime());
            if (!Number.isFinite(currentPositionSeconds) || currentPositionSeconds <= 0) {
                return null;
            }

            return Math.floor(currentPositionSeconds);
        }
        catch
        {
            return null;
        }
    }

    function getResumePositionSeconds(): number | null
    {
        const resumePositionSeconds = Number(data.resumePositionSeconds);
        if (!Number.isFinite(resumePositionSeconds) || resumePositionSeconds <= 0 || watched) {
            return null;
        }

        const durationSeconds = Number(currentVideo.duration_seconds ?? 0);
        if (Number.isFinite(durationSeconds) && durationSeconds > 0 && resumePositionSeconds > Math.floor(durationSeconds)) {
            return null;
        }

        return Math.floor(resumePositionSeconds);
    }

    function seekToResumePositionIfNeeded()
    {
        const videoYoutubeId = String(currentVideo.id);
        if (resumeSeekAppliedVideoId === videoYoutubeId || !player || typeof player.seekTo !== 'function') {
            return;
        }

        const resumePositionSeconds = getResumePositionSeconds();
        if (resumePositionSeconds == null) {
            return;
        }

        try
        {
            player.seekTo(resumePositionSeconds, true);
            resumeSeekAppliedVideoId = videoYoutubeId;
            lastDebugEvent = `resume seek: ${resumePositionSeconds}s`;
        }
        catch
        {
            // Retry on the next player-ready or route-driven cue opportunity.
        }
    }

    function shouldLocallyCapPlayback(): boolean
    {
        return localActiveVirtualChannel?.isPlaybackCapped() ?? false;
    }

    function startPolling()
    {
        stopPolling();
        seekToResumePositionIfNeeded();
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

                    if (localActiveVirtualChannel && deltaSeconds > 0) {
                        localActiveVirtualChannel = localActiveVirtualChannel.advance(deltaSeconds);
                    }

                    if (data.currentVirtualChannelId != null && deltaSeconds > 0) {
                        window.dispatchEvent(new CustomEvent('viewer:playback-tick', {
                            detail: {
                                virtualChannelId: data.currentVirtualChannelId,
                                deltaSeconds
                            }
                        }));
                    }

                    if (shouldLocallyCapPlayback()) {
                        lastDebugEvent = `local-cap: ${getLocalVirtualChannelUsageSeconds()}s`;
                        handleTimerCapReached();
                        return;
                    }
                }
                lastPlaybackTickAt = now;

                const current: number = Number(player.getCurrentTime());
                let duration: number = Number(typeof player.getDuration === 'function' ? player.getDuration() : (currentVideo.duration_seconds || 0));
                if (!duration || !Number.isFinite(duration) || duration <= 0) return;

                if (!historySessionCreated && !historySessionCreatePending && elapsedWatchSeconds >= HISTORY_SESSION_CREATE_THRESHOLD_SECONDS)
                {
                    lastDebugEvent = `create-threshold: ${Math.floor(elapsedWatchSeconds)}s`;
                    void createHistorySession();
                }

                if (
                    historySessionCreated
                    && !historyProgressUpdatePending
                    && (elapsedWatchSeconds - lastPersistedWatchSeconds) >= HISTORY_SESSION_UPDATE_INTERVAL_SECONDS
                )
                {
                    lastDebugEvent = `update-threshold: ${Math.floor(elapsedWatchSeconds)}s`;
                    void updateHistoryProgress();
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
            activeVirtualChannelUsageBaselineSeconds = localActiveVirtualChannel?.timerUsageSeconds
                ?? getLocalVirtualChannelUsageSeconds();
            elapsedWatchSeconds = 0;
            historySessionCreated = false;
            historySessionCreatePending = false;
            historyProgressUpdatePending = false;
            lastPersistedWatchSeconds = 0;
            lastHistoryActivityAt = null;
            activeHistorySessionWatchSecondsBaseline = 0;
        }

        isActivelyPlaying = active;
        lastPlaybackTickAt = Date.now();
    }

    function handleTimerCapReached(message = 'Daily timer limit reached for this virtual channel.')
    {
        timerStatusMessage = message;
        timerPlaybackBlocked = true;
        historySessionCreated = false;
        historySessionCreatePending = false;
        historyProgressUpdatePending = false;
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

    async function readActionFailureData(response: Response): Promise<Record<string, unknown> | null>
    {
        try
        {
            const payload = await response.json();
            if (!payload || typeof payload !== 'object') {
                return null;
            }

            const maybeData = (payload as { data?: unknown }).data;
            if (!maybeData || typeof maybeData !== 'object') {
                return null;
            }

            return maybeData as Record<string, unknown>;
        }
        catch
        {
            return null;
        }
    }

    async function createHistorySession()
    {
        const formData = buildHistoryProgressFormData(data.currentVirtualChannelId);

        try
        {
            const watchSeconds = getCurrentHistorySessionWatchSeconds();
            historySessionCreatePending = true;
            lastDebugEvent = `createHistorySession: send ${watchSeconds}s`;
            const response = await fetch('?/createHistorySession', {
                method: 'POST',
                body: formData
            });
            lastDebugResponse = `createHistorySession: ${response.status}`;
            if (!response.ok)
            {
                historySessionCreated = false;
                historySessionCreatePending = false;

                const failureData = await readActionFailureData(response);
                if (failureData?.timerState === 'capped') {
                    handleTimerCapReached(typeof failureData.message === 'string' ? failureData.message : undefined);
                }

                return;
            }
            historySessionCreated = true;
            historySessionCreatePending = false;
            lastPersistedWatchSeconds = watchSeconds;
            lastHistoryActivityAt = Date.now();
            lastDebugEvent = `createHistorySession: persisted ${lastPersistedWatchSeconds}s`;
        }
        catch
        {
            historySessionCreated = false;
            historySessionCreatePending = false;
            lastDebugResponse = 'createHistorySession: exception';
        }
    }

    function shouldFlushPendingHistory(): boolean
    {
        const persistedSeconds = Math.floor(lastPersistedWatchSeconds);
        const currentSeconds = getCurrentHistorySessionWatchSeconds();

        if (currentSeconds <= persistedSeconds) {
            return false;
        }

        if (!historySessionCreated) {
            return currentSeconds >= HISTORY_SESSION_CREATE_THRESHOLD_SECONDS;
        }

        return currentSeconds > 0;
    }

    function buildHistoryProgressFormData(virtualChannelId: string | number | null = activeVirtualChannelId): FormData
    {
        const formData = new FormData();
        formData.set('watchSeconds', String(getCurrentHistorySessionWatchSeconds()));

        if (virtualChannelId != null) {
            formData.set('virtualChannelId', String(virtualChannelId));
        }

        const lastPositionSeconds = getCurrentPlaybackPositionSeconds();
        if (lastPositionSeconds != null) {
            formData.set('lastPositionSeconds', String(lastPositionSeconds));
        }

        return formData;
    }

    function flushPendingHistory(videoYoutubeId: string, keepalive = false, virtualChannelId: string | number | null = activeVirtualChannelId)
    {
        if (!videoYoutubeId || !shouldFlushPendingHistory()) {
            lastDebugEvent = `flush skipped: ${videoYoutubeId || 'none'}`;
            return;
        }

        const currentSeconds = getCurrentHistorySessionWatchSeconds();
        const targetAction = historySessionCreated && Math.floor(lastPersistedWatchSeconds) > 0
            ? 'updateHistoryProgress'
            : 'createHistorySession';
        const targetUrl = `?/` + targetAction;
        lastDebugEvent = `flush ${targetAction}: ${videoYoutubeId} ${currentSeconds}s keepalive=${keepalive ? 'y' : 'n'}`;

        void fetch(targetUrl, {
            method: 'POST',
            body: buildHistoryProgressFormData(virtualChannelId),
            keepalive
        }).then((response) => {
            lastDebugResponse = `flush ${targetAction}: ${response.status}`;
            if (!response.ok) {
                if (targetAction === 'createHistorySession') {
                    historySessionCreatePending = false;
                }
                return;
            }

            lastPersistedWatchSeconds = currentSeconds;
            lastHistoryActivityAt = Date.now();

            if (targetAction === 'createHistorySession') {
                historySessionCreated = true;
                historySessionCreatePending = false;
            }

            lastDebugEvent = `flush ${targetAction}: persisted ${currentSeconds}s`;
        }).catch(() => {
            // Ignore final flush failures during teardown or route changes.
            if (targetAction === 'createHistorySession') {
                historySessionCreatePending = false;
            }
            lastDebugResponse = `flush ${targetAction}: exception`;
        });
    }

    async function updateHistoryProgress()
    {
        try
        {
            const watchSeconds = getCurrentHistorySessionWatchSeconds();
            historyProgressUpdatePending = true;
            lastDebugEvent = `updateHistoryProgress: send ${watchSeconds}s`;
            const response = await fetch('?/updateHistoryProgress', {
                method: 'POST',
                body: buildHistoryProgressFormData()
            });
            lastDebugResponse = `updateHistoryProgress: ${response.status}`;
            if (response.ok)
            {
                lastPersistedWatchSeconds = watchSeconds;
                lastHistoryActivityAt = Date.now();
                lastDebugEvent = `updateHistoryProgress: persisted ${lastPersistedWatchSeconds}s`;
            }
            else
            {
                const failureData = await readActionFailureData(response);

                if (failureData?.timerState === 'capped')
                {
                    handleTimerCapReached(typeof failureData.message === 'string' ? failureData.message : undefined);
                }
                else if (response.status === 404)
                {
                    historySessionCreated = false;
                    historySessionCreatePending = false;
                }
                else if (response.status === 409)
                {
                    elapsedWatchSeconds = 0;
                    historySessionCreated = false;
                    historySessionCreatePending = false;
                    lastPersistedWatchSeconds = 0;
                    lastHistoryActivityAt = null;
                    activeHistorySessionWatchSecondsBaseline = 0;
                }
            }
        }
        catch
        {
            // Ignore transient progress-update failures and retry later.
            lastDebugResponse = 'updateHistoryProgress: exception';
        }
        finally
        {
            historyProgressUpdatePending = false;
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

    async function handleMetaFlagToggle(kind: ViewerSelectionFlagKind)
    {
        if (kind === 'watched')
        {
            await updateWatchedStatus(showWatched ? 'unwatch' : 'watch');
            return;
        }

        const nextValue = kind === ViewerSelectionFlagKind.Favorite
            ? (favorite ? 0 : 1)
            : (ignored ? 0 : 1);

        try
        {
            const updatedVideo = await videoMutationService.toggleVideoFlag(currentVideo, kind, nextValue);

            if (!updatedVideo) {
                return;
            }

            if (kind === ViewerSelectionFlagKind.Favorite) {
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

    function handleRecommendationVideoChange(video: Video)
    {
        recommendations = recommendations.map((item) => item.id === video.id ? video : item);
    }

    onMount(() =>
    {
        const handlePageHide = () => {
            flushPendingHistory(activeVideoYoutubeId, true);
        };

        window.addEventListener('pagehide', handlePageHide);

        function createPlayer()
        {
            if ((window as any).YT && (window as any).YT.Player)
            {
                player = new (window as any).YT.Player('player', {
                    videoId: String(currentVideo.id),
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        rel: 0,
                        modestbranding: 1
                    },
                    events: {
                        onReady: () => {
                            if (timerPlaybackBlocked) {
                                handleTimerCapReached();
                                return;
                            }

                            seekToResumePositionIfNeeded();
                            startPolling();
                        },
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
            window.removeEventListener('pagehide', handlePageHide);
            flushPendingHistory(activeVideoYoutubeId, true);
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
        flushPendingHistory(activeVideoYoutubeId, true);
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
                    <svg id="svg_player_nav_prev" viewBox="0 0 24 96" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <polyline points="18,8 6,48 18,88"></polyline>
                    </svg>
                </a>
            {:else}
                <span id="a_player_nav_prev" aria-hidden="true"></span>
            {/if}

            <div id="div_player_surface">
                {#if timerStatusMessage}
                    <div id="div_player_status" aria-live="polite">
                        <p>{timerStatusMessage}</p>
                    </div>
                {/if}

                        <div id="player" title={currentVideo.title}></div>
            </div>

            {#if data.nextVideoYoutubeId}
                <a id="a_player_nav_next" href={buildWatchHref(data.nextVideoYoutubeId)} aria-label="Next video">
                    <svg id="svg_player_nav_next" viewBox="0 0 24 96" preserveAspectRatio="none" aria-hidden="true" focusable="false">
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
            <h1 id="h1_video_title">{currentVideo.title}</h1>
            <div id="div_title_meta">
                <div id="div_title_flag_actions">
                    <button
                        type="button"
                        class="icon favorite"
                        class:active={favorite}
                        aria-pressed={favorite}
                        title={favorite ? 'Clear favorite' : 'Mark favorite'}
                        on:click={() => void handleMetaFlagToggle(ViewerSelectionFlagKind.Favorite)}
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
                        on:click={() => void handleMetaFlagToggle(ViewerSelectionFlagKind.Watched)}
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
                        on:click={() => void handleMetaFlagToggle(ViewerSelectionFlagKind.Ignored)}
                    >
                        <span class="icon-glyph" aria-hidden="true">&#10005;</span>
                        <span class="sr-only">{ignored ? 'Clear ignored' : 'Mark ignored'}</span>
                    </button>
                </div>
                <a id="a_channel_link"
                   href={`/viewer?channelId=${currentVideo.channel_id}`}>{currentVideo.channel_title}</a>
                {#if currentVideo.published_at}
                    <span id="span_title_separator">|</span>
                    <span id="span_published_date">{formatDate(currentVideo.published_at)}</span>
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
                        watchHref={buildWatchHref(String(recommendation.id))}
                        {videoMutationService}
                        on:videochange={(event) => handleRecommendationVideoChange(event.detail)}
                    />
                {/each}
            </div>
        {/if}
    </section>

    <section id="section_debug_panel">
        <h2 id="h2_debug">Debug</h2>
        <div id="div_debug_grid">
            <div>video: {activeVideoYoutubeId}</div>
            <div>virtualChannelId: {String(data.currentVirtualChannelId)}</div>
            <div>elapsedWatchSeconds: {Math.floor(elapsedWatchSeconds)}</div>
            <div>lastPersistedWatchSeconds: {Math.floor(lastPersistedWatchSeconds)}</div>
            <div>historySessionCreated: {historySessionCreated ? 'true' : 'false'}</div>
            <div>isActivelyPlaying: {isActivelyPlaying ? 'true' : 'false'}</div>
            <div>route active usage: {data.activeVirtualChannelTimer?.timerUsageSeconds ?? 'null'}</div>
            <div>route active remaining: {data.activeVirtualChannelTimer?.timerRemainingSeconds ?? 'null'}</div>
            <div>lastDebugEvent: {lastDebugEvent}</div>
            <div>lastDebugResponse: {lastDebugResponse}</div>
        </div>
    </section>

    {#if currentVideo.description}
        <section id="section_description_panel">
            <div id="div_description_header">
                <h2 id="h2_description">Description</h2>
            </div>
            <pre id="pre_video_description">{currentVideo.description}</pre>
        </section>
    {/if}
</div>

<style>
    :global(body) {
        min-width: 300px;
    }

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
        align-items: stretch;
        justify-content: center;
    }

    #div_player_surface {
        width: var(--managed-width);
        max-height: var(--player-flex-wrapper-height);
        display: block;
        position: relative;
        aspect-ratio: 16 / 9;
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
        width: 100%;
        height: 100%;
        display: block;
        border: 2px solid #909090;
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
    }

    #div_player_status {
        width: 100%;
        height: 100%;
        display: flex;
        position: absolute;
        inset: 0;
        z-index: 3;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(229, 115, 115, 0.92);
        border-radius: var(--radius);
        padding: 2rem;
        box-sizing: border-box;
        background-color: rgba(24, 24, 24, 0.92);
        color: var(--text);
        text-align: center;
    }

    #div_player_status p {
        margin: 0;
        max-width: 28rem;
        font-size: clamp(1.75rem, 2.8vw, 3rem);
        font-weight: 700;
        line-height: 1.2;
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

    #section_debug_panel {
        border: 1px solid var(--border);
        padding: 1rem 1.1rem;
        border-radius: var(--radius);
        box-sizing: border-box;
        background-color: var(--bg-panel);
    }

    #div_description_header {
        margin-bottom: 1rem;
    }

    #div_debug_grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.5rem 1rem;
        color: var(--text-muted);
        font-family: var(--font-mono, monospace);
        font-size: 0.85rem;
        line-height: 1.4;
    }

    #h2_debug {
        margin-bottom: 0.8rem;
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
        overflow-wrap: anywhere;
        word-break: break-word;
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

        #div_player_flex_wrapper {
            min-width: 0;
        }

        #div_player_frame {
            --free-width: 100%;
            --managed-width: 100%;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        #div_player_surface {
            order: 1;
            width: 100%;
            flex: 0 0 100%;
        }

        #a_player_nav_prev,
        #a_player_nav_next {
            width: calc(50% - 0.25rem);
            height: 3.2rem;
            min-width: 0;
            order: 2;
        }

        #svg_player_nav_prev,
        #svg_player_nav_next {
            width: 2.1rem;
            height: 1.25rem;
            stroke-width: 5;
        }

        #player {
            width: 100%;
            height: 100%;
            min-height: calc(300px / 16 * 9);
            min-width: 0;
            max-width: 100%;
        }

        #div_video_meta_panel {
            min-height: 0;
        }
    }
</style>
<!-- apply-patch-anchor - do not delete -->
