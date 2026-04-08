import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { error, fail } from '@sveltejs/kit';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

const HISTORY_SESSION_GAP_MS = 5 * 60 * 1000;

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ params, cookies }: { params: { videoId: string }, cookies: any }) =>
{
    const videoId = String(params.videoId || '').trim();
    if (!videoId) throw error(400, 'Missing videoId');
    const profileKey = getActiveProfileKey(cookies);

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Load the video in the context of the active site-wide profile.
        const profiles = new ProfileDAO(db);
        ensureProfiles(profiles);
        const profile = profiles.getByKey(profileKey) || profiles.getByKey('default');
        if (!profile) throw error(500, 'Failed to resolve default profile');

        // Load the selected video with channel + flags
        const vdao = new VideoDAO(db);
        const video = vdao.getForViewerByYoutubeId(videoId, profile.id);
        if (!video) throw error(404, 'Video not found');

        return { video, profileId: profile.id, profileKey, profileName: profile.name };
    } finally {
        dbw.close();
    }
};

export const actions = {
    // Persist the first qualifying watch-history session independently of watched flags.
    async createHistorySession({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await request.formData();
        const watchSeconds = Number(form.get('watchSeconds') || 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds <= 5) {
            return fail(400, { message: 'Insufficient watch time for history session' });
        }

        const profileKey = getActiveProfileKey(cookies);
        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const profiles = new ProfileDAO(db);
            ensureProfiles(profiles);
            const profile = profiles.getByKey(profileKey) || profiles.getByKey('default');
            if (!profile) return fail(500, { message: 'Failed to resolve profile' });

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profile.id);
            if (!video) return fail(404, { message: 'Video not found' });

            const history = new HistoryDAO(db);
            const now = Date.now();
            const latestSession = history.findMostRecentSession(video.id, profile.id);

            if (latestSession && (now - latestSession.last_updated_at) <= HISTORY_SESSION_GAP_MS) {
                history.updateSessionProgress(latestSession.id, {
                    last_updated_at: now,
                    time_watched_seconds: Math.floor(watchSeconds)
                });
            } else {
                history.createSession({
                    video_id: video.id,
                    profile_id: profile.id,
                    session_started_at: now,
                    last_updated_at: now,
                    time_watched_seconds: Math.floor(watchSeconds)
                });
            }

            return { ok: true };
        }
        finally {
            dbw.close();
        }
    },

    // Update the active watch-history session independently of watched flags.
    async updateHistoryProgress({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await request.formData();
        const watchSeconds = Number(form.get('watchSeconds') || 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds < 0) {
            return fail(400, { message: 'Invalid watch time' });
        }

        const profileKey = getActiveProfileKey(cookies);
        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const profiles = new ProfileDAO(db);
            ensureProfiles(profiles);
            const profile = profiles.getByKey(profileKey) || profiles.getByKey('default');
            if (!profile) return fail(500, { message: 'Failed to resolve profile' });

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profile.id);
            if (!video) return fail(404, { message: 'Video not found' });

            const history = new HistoryDAO(db);
            const session = history.findMostRecentSession(video.id, profile.id);
            if (!session) return fail(404, { message: 'History session not found' });
            if ((Date.now() - session.last_updated_at) > HISTORY_SESSION_GAP_MS) {
                return fail(409, { message: 'History session is no longer active' });
            }

            history.updateSessionProgress(session.id, {
                last_updated_at: Date.now(),
                time_watched_seconds: Math.floor(watchSeconds)
            });

            return { ok: true };
        }
        finally {
            dbw.close();
        }
    },

    async markWatched({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await request.formData();
        const intent = String(form.get('intent') || 'watch'); // 'watch' | 'unwatch'
        const profileKey = getActiveProfileKey(cookies);

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const profiles = new ProfileDAO(db);
            ensureProfiles(profiles);
            const profile = profiles.getByKey(profileKey) || profiles.getByKey('default');
            if (!profile) return fail(500, { message: 'Failed to resolve profile' });

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profile.id);
            if (!video) return fail(404, { message: 'Video not found' });

            const flags = new FlagsDAO(db);

            if (intent === 'unwatch')
            {
                // Clear watched flag
                flags.set(video.id, profile.id, { watched: 0 });
            }
            else
            {
                // Set watched flag without altering watch history.
                flags.set(video.id, profile.id, { watched: 1 });
            }
        }
        finally {
            dbw.close();
        }

        return {
            ok: true,
            watched: intent === 'unwatch' ? 0 : 1
        };
    }
};
