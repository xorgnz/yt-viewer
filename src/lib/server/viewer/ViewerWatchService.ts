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
import type { ViewerVirtualChannel } from '$lib/viewer/types';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

type ViewerWatchVideo = ViewerVideoRecord;

export type ViewerWatchLoadModel = {
    video: ViewerWatchVideo;
    recommendations: ViewerWatchVideo[];
    previousVideoYoutubeId: string | null;
    nextVideoYoutubeId: string | null;
    currentVirtualChannelId: number | null;
    activeVirtualChannel: ViewerVirtualChannel | null;
    playbackBlockedMessage: string | null;
    navigationFilters: ViewerQueryFilters;
    profileId: number;
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
    private readonly virtualChannelService: Pick<ViewerVirtualChannelService, 'getVirtualChannelById'>;

    constructor(
        viewerVideoReadRepository: ViewerVideoReadRepository,
        flagsDAO: FlagsDAO,
        historyDAO: HistoryDAO,
        profileContext: ServerProfileContext,
        recommendationService: ViewerRecommendationService,
        virtualChannelService: Pick<ViewerVirtualChannelService, 'getVirtualChannelById'>
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
        let activeVirtualChannel: ViewerVirtualChannel | null = null;

        if (filters.virtualChannelId != null) {
            const group = await this.virtualChannelService.getVirtualChannelById(filters.virtualChannelId);

            if (!group) {
                return { ok: false, status: 404, message: 'Virtual channel not found' };
            }

            activeVirtualChannel = group;

            if (group.timerState === 'capped') {
                playbackBlockedMessage = 'Daily timer limit reached for this virtual channel.';
            }
        }

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

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
                activeVirtualChannel,
                playbackBlockedMessage,
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
        virtualChannelId: number | null,
        now = Date.now()
    ): Promise<ViewerWatchResult>
    {
        const groupCheck = await this.ensureGroupAllowsPlayback(virtualChannelId);
        if (!groupCheck.ok) {
            return groupCheck;
        }

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found', code: 'video_not_found' };
        }

        const latestSession = await this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        const timeWatchedSeconds = Math.floor(watchSeconds);

        if (latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS)
        {
            await this.historyDAO.updateSessionProgress(latestSession.id, {
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }
        else
        {
            await this.historyDAO.createSession({
                video_id: video.id,
                profile_id: this.profileContext.activeProfileId,
                session_started_at: now,
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }

        const postWriteGroupCheck = await this.ensureGroupAllowsPlayback(virtualChannelId);
        if (!postWriteGroupCheck.ok) {
            return postWriteGroupCheck;
        }

        return { ok: true };
    }

    async updateHistoryProgress(
        videoYoutubeId: string,
        watchSeconds: number,
        virtualChannelId: number | null,
        now = Date.now()
    ): Promise<ViewerWatchResult>
    {
        const groupCheck = await this.ensureGroupAllowsPlayback(virtualChannelId);
        if (!groupCheck.ok) {
            return groupCheck;
        }

        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found', code: 'video_not_found' };
        }

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

        await this.historyDAO.updateSessionProgress(session.id, {
            last_updated_at: now,
            time_watched_seconds: Math.floor(watchSeconds)
        });

        const postWriteGroupCheck = await this.ensureGroupAllowsPlayback(virtualChannelId);
        if (!postWriteGroupCheck.ok) {
            return postWriteGroupCheck;
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

    private async ensureGroupAllowsPlayback(virtualChannelId: number | null): Promise<ViewerWatchResult>
    {
        if (virtualChannelId == null) {
            return { ok: true };
        }

        const group = await this.virtualChannelService.getVirtualChannelById(virtualChannelId);
        if (!group) {
            return {
                ok: false,
                status: 404,
                message: 'Virtual channel not found',
                code: 'virtual_channel_not_found'
            };
        }

        if (group.timerState === 'capped') {
            return {
                ok: false,
                status: 409,
                message: 'Virtual channel timer limit reached',
                code: 'timer_capped'
            };
        }

        return { ok: true };
    }
}
// apply-patch-anchor - do not delete
