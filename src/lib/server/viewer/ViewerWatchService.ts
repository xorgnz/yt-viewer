import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import {
    ViewerVideoReadRepository,
    type ViewerVideoRecord
} from '$lib/daos/readers/ViewerVideoReadRepository';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';
import { ViewerRecommendationService } from '$lib/server/viewer/ViewerRecommendationService';
import type { ViewerVirtualChannelService } from '$lib/server/viewer/ViewerVirtualChannelService';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import {
    ViewerVirtualChannelTimer
} from '$lib/viewer/ViewerVirtualChannelTimer';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

type ViewerWatchVideo = ViewerVideoRecord;

export type ViewerWatchLoadModel = {
    video: ViewerWatchVideo;
    recommendations: ViewerWatchVideo[];
    previousVideoYoutubeId: string | null;
    nextVideoYoutubeId: string | null;
    currentVirtualChannelId: string | number | null;
    activeVirtualChannelTimer: ViewerVirtualChannelTimer | null;
    playbackBlockedMessage: string | null;
    activeHistorySessionWatchSecondsBaseline: number;
    activeHistorySessionLastUpdatedAt: number | null;
    navigationFilters: ViewerQueryFilters;
    profileId: string | number;
    profileKey: string;
    profileName: string;
};

export type ViewerWatchResult =
    | { ok: true }
    | {
        ok: false;
        status: 404 | 409;
        message: string;
        code:
            | 'video_not_found'
            | 'virtual_channel_not_found'
            | 'timer_capped'
            | 'history_session_not_found'
            | 'history_session_inactive';
    };

export type ViewerWatchLoadResult =
    | { ok: true; data: ViewerWatchLoadModel }
    | { ok: false; status: 404 | 409; message: string };

export type ViewerWatchFlagResult =
    | { ok: true; watched: 0 | 1 }
    | { ok: false; status: 404; message: string };

export class ViewerWatchService
{
    private readonly viewerVideoReadRepository: ViewerVideoReadRepository;
    private readonly flagsDAO: FlagsDAO;
    private readonly historyDAO: HistoryDAO;
    private readonly profileContext: ServerProfileContext;
    private readonly recommendationService: ViewerRecommendationService;
    private readonly virtualChannelService: ViewerVirtualChannelService;

    constructor(
        viewerVideoReadRepository: ViewerVideoReadRepository,
        flagsDAO: FlagsDAO,
        historyDAO: HistoryDAO,
        profileContext: ServerProfileContext,
        recommendationService: ViewerRecommendationService,
        virtualChannelService: ViewerVirtualChannelService
    )
    {
        this.viewerVideoReadRepository = viewerVideoReadRepository;
        this.flagsDAO = flagsDAO;
        this.historyDAO = historyDAO;
        this.profileContext = profileContext;
        this.recommendationService = recommendationService;
        this.virtualChannelService = virtualChannelService;
    }

    async load(videoYoutubeId: string, filters: ViewerQueryFilters): Promise<ViewerWatchLoadResult>
    {
        let playbackBlockedMessage: string | null = null;
        let activeVirtualChannel: ViewerVirtualChannelTimer | null = null;

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        if (filters.virtualChannelId != null) {
            const virtualChannel = ViewerVirtualChannelTimer.normalizeViewModel(
                await this.virtualChannelService.getVirtualChannelById(filters.virtualChannelId)
            );

            if (!virtualChannel) {
                return { ok: false, status: 404, message: 'Virtual channel not found' };
            }

            activeVirtualChannel = virtualChannel;

            if (
                virtualChannel.isPlaybackCapped()
                || await this.shouldBlockReloadForNearlyCappedSession(video.id, virtualChannel)
            ) {
                playbackBlockedMessage = 'Daily timer limit reached for this virtual channel.';
            }
        }

        const latestSession = await this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        const hasActiveHistorySession = latestSession != null
            && (Date.now() - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS;
        const activeHistorySessionWatchSecondsBaseline = hasActiveHistorySession
            ? Math.max(0, Math.floor(latestSession.time_watched_seconds))
            : 0;
        const activeHistorySessionLastUpdatedAt = hasActiveHistorySession
            ? latestSession.last_updated_at
            : null;

        console.info('[viewer-watch.load]', {
            videoYoutubeId,
            virtualChannelId: filters.virtualChannelId,
            activeVirtualChannelUsageSeconds: activeVirtualChannel?.timerUsageSeconds ?? null,
            activeVirtualChannelRemainingSeconds: activeVirtualChannel?.timerRemainingSeconds ?? null,
            activeVirtualChannelState: activeVirtualChannel?.timerState ?? null,
            activeHistorySessionWatchSecondsBaseline
        });

        const adjacent = await this.viewerVideoReadRepository.findAdjacentYoutubeIds(
            { youtube_id: video.youtube_id },
            {
                term: filters.term,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                watched: filters.watched,
                ignored: filters.ignored,
                channelId: filters.channelId,
                virtualChannelId: filters.virtualChannelId,
                sort: filters.sort
            },
            this.profileContext.activeProfileId
        );

        return {
            ok: true,
            data: {
                video,
                recommendations: await this.recommendationService.load(video, filters.virtualChannelId),
                previousVideoYoutubeId: adjacent.previousYoutubeId,
                nextVideoYoutubeId: adjacent.nextYoutubeId,
                currentVirtualChannelId: filters.virtualChannelId,
                activeVirtualChannelTimer: activeVirtualChannel,
                playbackBlockedMessage,
                activeHistorySessionWatchSecondsBaseline,
                activeHistorySessionLastUpdatedAt,
                navigationFilters: filters,
                profileId: this.profileContext.activeProfileId,
                profileKey: this.profileContext.activeProfileKey,
                profileName: this.profileContext.activeProfileName
            }
        };
    }

    async createHistorySession(
        videoYoutubeId: string,
        watchSeconds: number,
        virtualChannelId: string | number | null,
        now = Date.now()
    ): Promise<ViewerWatchResult>
    {
        console.info('[viewer-watch.createHistorySession.start]', {
            videoYoutubeId,
            virtualChannelId,
            watchSeconds: Math.floor(watchSeconds),
            now
        });

        const virtualChannelCheck = await this.ensureVirtualChannelAllowsPlayback(virtualChannelId);
        if (!virtualChannelCheck.ok) {
            console.info('[viewer-watch.createHistorySession.blocked]', virtualChannelCheck);
            return virtualChannelCheck;
        }

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found', code: 'video_not_found' };
        }

        const preWriteVirtualChannel = virtualChannelId == null
            ? null
            : ViewerVirtualChannelTimer.normalizeViewModel(
                await this.virtualChannelService.getVirtualChannelById(virtualChannelId)
            );
        const latestSession = await this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        const timeWatchedSeconds = Math.floor(watchSeconds);
        const previousWatchSeconds = latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS
            ? Math.max(0, Math.floor(latestSession.time_watched_seconds))
            : 0;
        const consumedSecondsDelta = Math.max(0, timeWatchedSeconds - previousWatchSeconds);

        if (latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS)
        {
            console.info('[viewer-watch.createHistorySession.update-existing]', {
                sessionId: latestSession.id,
                previousLastUpdatedAt: latestSession.last_updated_at,
                timeWatchedSeconds
            });
            await this.historyDAO.updateSessionProgress(latestSession.id, {
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }
        else
        {
            console.info('[viewer-watch.createHistorySession.create-new]', {
                videoId: video.id,
                profileId: this.profileContext.activeProfileId,
                timeWatchedSeconds
            });
            await this.historyDAO.createSession({
                video_id: video.id,
                profile_id: this.profileContext.activeProfileId,
                session_started_at: now,
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }

        if (virtualChannelId != null) {
            await this.virtualChannelService.consumeExtraTimerSecondsForWatchDelta(
                virtualChannelId,
                preWriteVirtualChannel,
                consumedSecondsDelta
            );
        }

        const postWriteVirtualChannelCheck = await this.ensureVirtualChannelAllowsPlayback(virtualChannelId);
        if (!postWriteVirtualChannelCheck.ok) {
            console.info('[viewer-watch.createHistorySession.post-write-blocked]', postWriteVirtualChannelCheck);
            return postWriteVirtualChannelCheck;
        }

        if (virtualChannelId != null) {
            const postWriteVirtualChannel = await this.virtualChannelService.getVirtualChannelById(virtualChannelId);
            const normalizedPostWriteVirtualChannel = ViewerVirtualChannelTimer.normalizeViewModel(postWriteVirtualChannel);
            console.info('[viewer-watch.createHistorySession.complete]', {
                virtualChannelId,
                activeVirtualChannelUsageSeconds: normalizedPostWriteVirtualChannel?.timerUsageSeconds ?? null,
                activeVirtualChannelRemainingSeconds: normalizedPostWriteVirtualChannel?.timerRemainingSeconds ?? null,
                activeVirtualChannelState: normalizedPostWriteVirtualChannel?.timerState ?? null
            });
        }

        return { ok: true };
    }

    async updateHistoryProgress(
        videoYoutubeId: string,
        watchSeconds: number,
        virtualChannelId: string | number | null,
        now = Date.now()
    ): Promise<ViewerWatchResult>
    {
        console.info('[viewer-watch.updateHistoryProgress.start]', {
            videoYoutubeId,
            virtualChannelId,
            watchSeconds: Math.floor(watchSeconds),
            now
        });

        const virtualChannelCheck = await this.ensureVirtualChannelAllowsPlayback(virtualChannelId);
        if (!virtualChannelCheck.ok) {
            console.info('[viewer-watch.updateHistoryProgress.blocked]', virtualChannelCheck);
            return virtualChannelCheck;
        }

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found', code: 'video_not_found' };
        }

        const preWriteVirtualChannel = virtualChannelId == null
            ? null
            : ViewerVirtualChannelTimer.normalizeViewModel(
                await this.virtualChannelService.getVirtualChannelById(virtualChannelId)
            );
        const session = await this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        if (!session) {
            return {
                ok: false,
                status: 404,
                message: 'History session not found',
                code: 'history_session_not_found'
            };
        }

        if ((now - session.last_updated_at) > HISTORY_SESSION_GAP_MS) {
            return {
                ok: false,
                status: 409,
                message: 'History session is no longer active',
                code: 'history_session_inactive'
            };
        }

        const previousWatchSeconds = Math.max(0, Math.floor(session.time_watched_seconds));
        const nextWatchSeconds = Math.floor(watchSeconds);
        const consumedSecondsDelta = Math.max(0, nextWatchSeconds - previousWatchSeconds);

        await this.historyDAO.updateSessionProgress(session.id, {
            last_updated_at: now,
            time_watched_seconds: nextWatchSeconds
        });

        console.info('[viewer-watch.updateHistoryProgress.updated]', {
            sessionId: session.id,
            watchSeconds: nextWatchSeconds
        });

        if (virtualChannelId != null) {
            await this.virtualChannelService.consumeExtraTimerSecondsForWatchDelta(
                virtualChannelId,
                preWriteVirtualChannel,
                consumedSecondsDelta
            );
        }

        const postWriteVirtualChannelCheck = await this.ensureVirtualChannelAllowsPlayback(virtualChannelId);
        if (!postWriteVirtualChannelCheck.ok) {
            console.info('[viewer-watch.updateHistoryProgress.post-write-blocked]', postWriteVirtualChannelCheck);
            return postWriteVirtualChannelCheck;
        }

        if (virtualChannelId != null) {
            const postWriteVirtualChannel = await this.virtualChannelService.getVirtualChannelById(virtualChannelId);
            const normalizedPostWriteVirtualChannel = ViewerVirtualChannelTimer.normalizeViewModel(postWriteVirtualChannel);
            console.info('[viewer-watch.updateHistoryProgress.complete]', {
                virtualChannelId,
                activeVirtualChannelUsageSeconds: normalizedPostWriteVirtualChannel?.timerUsageSeconds ?? null,
                activeVirtualChannelRemainingSeconds: normalizedPostWriteVirtualChannel?.timerRemainingSeconds ?? null,
                activeVirtualChannelState: normalizedPostWriteVirtualChannel?.timerState ?? null
            });
        }

        return { ok: true };
    }

    async setWatched(videoYoutubeId: string, watched: boolean): Promise<ViewerWatchFlagResult>
    {
        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        await this.flagsDAO.set(video.id, this.profileContext.activeProfileId, {
            watched: watched ? 1 : 0
        });

        return {
            ok: true,
            watched: watched ? 1 : 0
        };
    }

    private async loadVideo(videoYoutubeId: string): Promise<ViewerWatchVideo | null>
    {
        return await this.viewerVideoReadRepository.getByYoutubeId(videoYoutubeId, this.profileContext.activeProfileId) || null;
    }

    private async ensureVirtualChannelAllowsPlayback(virtualChannelId: string | number | null): Promise<ViewerWatchResult>
    {
        if (virtualChannelId == null) {
            return { ok: true };
        }

        const virtualChannel = ViewerVirtualChannelTimer.normalizeViewModel(
            await this.virtualChannelService.getVirtualChannelById(virtualChannelId)
        );
        if (!virtualChannel) {
            return {
                ok: false,
                status: 404,
                message: 'Virtual channel not found',
                code: 'virtual_channel_not_found'
            };
        }

        if (virtualChannel.isPlaybackCapped()) {
            return {
                ok: false,
                status: 409,
                message: 'Virtual channel timer limit reached',
                code: 'timer_capped'
            };
        }

        return { ok: true };
    }

    private async shouldBlockReloadForNearlyCappedSession(
        videoId: string | number,
        virtualChannel: ViewerVirtualChannelTimer,
        now = Date.now()
    ): Promise<boolean>
    {
        if (!virtualChannel.shouldBlockActiveSessionReload(1)) {
            return false;
        }

        const latestSession = await this.historyDAO.findMostRecentSession(videoId, this.profileContext.activeProfileId);
        if (!latestSession) {
            return false;
        }

        return (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS;
    }
}
// apply-patch-anchor - do not delete
