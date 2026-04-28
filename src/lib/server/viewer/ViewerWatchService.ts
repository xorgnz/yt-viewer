import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import {
    ViewerVideoReadRepository,
    type ViewerVideoRecord
} from '$lib/daos/readers/ViewerVideoReadRepository';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';
import { ViewerRecommendationService } from '$lib/server/viewer/ViewerRecommendationService';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

type ViewerWatchVideo = ViewerVideoRecord;

export type ViewerWatchLoadModel = {
    video: ViewerWatchVideo;
    recommendations: ViewerWatchVideo[];
    previousVideoYoutubeId: string | null;
    nextVideoYoutubeId: string | null;
    currentGroupId: number | null;
    navigationFilters: ViewerQueryFilters;
    profileId: number;
    profileKey: string;
    profileName: string;
};

export type ViewerWatchResult =
    | { ok: true }
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

    constructor(
        viewerVideoReadRepository: ViewerVideoReadRepository,
        flagsDAO: FlagsDAO,
        historyDAO: HistoryDAO,
        profileContext: ServerProfileContext,
        recommendationService: ViewerRecommendationService
    )
    {
        this.viewerVideoReadRepository = viewerVideoReadRepository;
        this.flagsDAO = flagsDAO;
        this.historyDAO = historyDAO;
        this.profileContext = profileContext;
        this.recommendationService = recommendationService;
    }

    async load(videoYoutubeId: string, filters: ViewerQueryFilters): Promise<ViewerWatchLoadModel | null>
    {
        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return null;
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
                groupId: filters.groupId,
                sort: filters.sort
            },
            this.profileContext.activeProfileId
        );

        return {
            video,
            recommendations: await this.recommendationService.load(video, filters.groupId),
            previousVideoYoutubeId: adjacent.previousYoutubeId,
            nextVideoYoutubeId: adjacent.nextYoutubeId,
            currentGroupId: filters.groupId,
            navigationFilters: filters,
            profileId: this.profileContext.activeProfileId,
            profileKey: this.profileContext.activeProfileKey,
            profileName: this.profileContext.activeProfileName
        };
    }

    async createHistorySession(videoYoutubeId: string, watchSeconds: number, now = Date.now()): Promise<ViewerWatchResult>
    {
        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
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

        return { ok: true };
    }

    async updateHistoryProgress(videoYoutubeId: string, watchSeconds: number, now = Date.now()): Promise<ViewerWatchResult>
    {
        const video = await this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        const session = await this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        if (!session) {
            return { ok: false, status: 404, message: 'History session not found' };
        }

        if ((now - session.last_updated_at) > HISTORY_SESSION_GAP_MS) {
            return { ok: false, status: 409, message: 'History session is no longer active' };
        }

        await this.historyDAO.updateSessionProgress(session.id, {
            last_updated_at: now,
            time_watched_seconds: Math.floor(watchSeconds)
        });

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
}
// apply-patch-anchor - do not delete
