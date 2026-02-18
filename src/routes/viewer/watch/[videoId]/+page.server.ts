import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { error, fail, redirect } from '@sveltejs/kit';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ params }: { params: { videoId: string } }) =>
{
    const videoId = String(params.videoId || '').trim();
    if (!videoId) throw error(400, 'Missing videoId');

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Ensure default profile exists
        const profiles = new ProfileDAO(db);
        profiles.upsertByKey('default', 'Default');
        const profile = profiles.getByKey('default');
        if (!profile) throw error(500, 'Failed to resolve default profile');

        // Load the selected video with channel + flags
        const vdao = new VideoDAO(db);
        const video = vdao.getForViewerByYoutubeId(videoId, profile.id);
        if (!video) throw error(404, 'Video not found');

        return { video, profileId: profile.id };
    } finally {
        dbw.close();
    }
};

export const actions = {
    async markWatched({ request, params }: { request: Request; params: { videoId: string } })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await request.formData();
        const intent = String(form.get('intent') || 'watch'); // 'watch' | 'unwatch'

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const profiles = new ProfileDAO(db);
            profiles.upsertByKey('default', 'Default');
            const profile = profiles.getByKey('default');
            if (!profile) return fail(500, { message: 'Failed to resolve profile' });

            const vdao = new VideoDAO(db);
            const video = vdao.getForViewerByYoutubeId(videoYoutubeId, profile.id);
            if (!video) return fail(404, { message: 'Video not found' });

            const flags = new FlagsDAO(db);
            const history = new HistoryDAO(db);

            if (intent === 'unwatch')
            {
                // Clear watched flag
                flags.set(video.id, profile.id, { watched: 0 });
            }
            else
            {
                // Set watched flag and record history
                flags.set(video.id, profile.id, { watched: 1 });
                history.add({ video_id: video.id, profile_id: profile.id, watched_at: Date.now() });
            }
        }
        finally {
            dbw.close();
        }

        throw redirect(303, `/viewer/watch/${videoYoutubeId}`);
    }
};
