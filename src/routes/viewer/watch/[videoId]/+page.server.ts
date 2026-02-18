import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { error } from '@sveltejs/kit';

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
