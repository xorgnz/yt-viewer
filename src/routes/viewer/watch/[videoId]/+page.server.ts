import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { error, fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

export const load = async ({ params, cookies }: { params: { videoId: string }, cookies: any }) =>
{
    const videoId = String(params.videoId || '').trim();
    if (!videoId) throw error(400, 'Missing videoId');

    return ServerDatabaseContext.run(({ db }) => {
        // Load the video in the context of the active site-wide profile.
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

        // Load the selected video with channel + flags
        const vdao = new VideoDAO(db);
        const video = vdao.getForViewerByYoutubeId(videoId, profileContext.activeProfileId);
        if (!video) throw error(404, 'Video not found');

        return {
            video,
            profileId: profileContext.activeProfileId,
            profileKey: profileContext.activeProfileKey,
            profileName: profileContext.activeProfileName
        };
    });
};

export const actions = {
    // Persist the first qualifying watch-history session independently of watched flags.
    async createHistorySession({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await ServerActionForm.fromRequest(request);
        const watchSeconds = form.getNumber('watchSeconds', 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds <= 5) {
            return fail(400, { message: 'Insufficient watch time for history session' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profileContext.activeProfileId);
            if (!video) return fail(404, { message: 'Video not found' });

            const history = new HistoryDAO(db);
            const now = Date.now();
            const latestSession = history.findMostRecentSession(video.id, profileContext.activeProfileId);

            if (latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS) {
                history.updateSessionProgress(latestSession.id, {
                    last_updated_at: now,
                    time_watched_seconds: Math.floor(watchSeconds)
                });
            } else {
                history.createSession({
                    video_id: video.id,
                    profile_id: profileContext.activeProfileId,
                    session_started_at: now,
                    last_updated_at: now,
                    time_watched_seconds: Math.floor(watchSeconds)
                });
            }

            return { ok: true };
        });
    },

    // Update the active watch-history session independently of watched flags.
    async updateHistoryProgress({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await ServerActionForm.fromRequest(request);
        const watchSeconds = form.getNumber('watchSeconds', 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds < 0) {
            return fail(400, { message: 'Invalid watch time' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profileContext.activeProfileId);
            if (!video) return fail(404, { message: 'Video not found' });

            const history = new HistoryDAO(db);
            const session = history.findMostRecentSession(video.id, profileContext.activeProfileId);
            if (!session) return fail(404, { message: 'History session not found' });
            if ((Date.now() - session.last_updated_at) > HISTORY_SESSION_GAP_MS) {
                return fail(409, { message: 'History session is no longer active' });
            }

            history.updateSessionProgress(session.id, {
                last_updated_at: Date.now(),
                time_watched_seconds: Math.floor(watchSeconds)
            });

            return { ok: true };
        });
    },

    async markWatched({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await ServerActionForm.fromRequest(request);
        const intent = form.getTrimmedString('intent', 'watch');

        return ServerDatabaseContext.run(({ db }) => {
            const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profileContext.activeProfileId);
            if (!video) return fail(404, { message: 'Video not found' });

            const flags = new FlagsDAO(db);

            if (intent === 'unwatch')
            {
                // Clear watched flag
                flags.set(video.id, profileContext.activeProfileId, { watched: 0 });
            }
            else
            {
                // Set watched flag without altering watch history.
                flags.set(video.id, profileContext.activeProfileId, { watched: 1 });
            }
            return {
                ok: true,
                watched: intent === 'unwatch' ? 0 : 1
            };
        });
    }
};
