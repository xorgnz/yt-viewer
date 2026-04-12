import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { VideoDAO } from '$lib/daos/videoDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

type ViewerWatchVideo = NonNullable<ReturnType<VideoDAO['getForViewerByYoutubeId']>>;

export type ViewerWatchLoadModel = {
    video: ViewerWatchVideo;
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
    private readonly videoDAO: VideoDAO;
    private readonly flagsDAO: FlagsDAO;
    private readonly historyDAO: HistoryDAO;
    private readonly profileContext: ServerProfileContext;

    constructor(
        videoDAO: VideoDAO,
        flagsDAO: FlagsDAO,
        historyDAO: HistoryDAO,
        profileContext: ServerProfileContext
    )
    {
        this.videoDAO = videoDAO;
        this.flagsDAO = flagsDAO;
        this.historyDAO = historyDAO;
        this.profileContext = profileContext;
    }

    load(videoYoutubeId: string): ViewerWatchLoadModel | null
    {
        const video = this.loadVideo(videoYoutubeId);
        if (!video) {
            return null;
        }

        return {
            video,
            profileId: this.profileContext.activeProfileId,
            profileKey: this.profileContext.activeProfileKey,
            profileName: this.profileContext.activeProfileName
        };
    }

    createHistorySession(videoYoutubeId: string, watchSeconds: number, now = Date.now()): ViewerWatchResult
    {
        const video = this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        const latestSession = this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        const timeWatchedSeconds = Math.floor(watchSeconds);

        if (latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS)
        {
            this.historyDAO.updateSessionProgress(latestSession.id, {
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }
        else
        {
            this.historyDAO.createSession({
                video_id: video.id,
                profile_id: this.profileContext.activeProfileId,
                session_started_at: now,
                last_updated_at: now,
                time_watched_seconds: timeWatchedSeconds
            });
        }

        return { ok: true };
    }

    updateHistoryProgress(videoYoutubeId: string, watchSeconds: number, now = Date.now()): ViewerWatchResult
    {
        const video = this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        const session = this.historyDAO.findMostRecentSession(video.id, this.profileContext.activeProfileId);
        if (!session) {
            return { ok: false, status: 404, message: 'History session not found' };
        }

        if ((now - session.last_updated_at) > HISTORY_SESSION_GAP_MS) {
            return { ok: false, status: 409, message: 'History session is no longer active' };
        }

        this.historyDAO.updateSessionProgress(session.id, {
            last_updated_at: now,
            time_watched_seconds: Math.floor(watchSeconds)
        });

        return { ok: true };
    }

    setWatched(videoYoutubeId: string, watched: boolean): ViewerWatchFlagResult
    {
        const video = this.loadVideo(videoYoutubeId);
        if (!video) {
            return { ok: false, status: 404, message: 'Video not found' };
        }

        this.flagsDAO.set(video.id, this.profileContext.activeProfileId, {
            watched: watched ? 1 : 0
        });

        return {
            ok: true,
            watched: watched ? 1 : 0
        };
    }

    private loadVideo(videoYoutubeId: string): ViewerWatchVideo | null
    {
        return this.videoDAO.getForViewerByYoutubeId(videoYoutubeId, this.profileContext.activeProfileId) || null;
    }
}
