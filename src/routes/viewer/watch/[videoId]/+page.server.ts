import { error, fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { ViewerActionParser } from '$lib/server/viewer/ViewerActionParser';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load = async ({ params, cookies }: { params: { videoId: string }, cookies: any }) =>
{
    const videoId = String(params.videoId || '').trim();
    if (!videoId) throw error(400, 'Missing videoId');

    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = await ViewerServiceContext.resolve(db, cookies);
        const result = await serviceContext.watchService.load(videoId);
        if (!result) throw error(404, 'Video not found');

        return result;
    });
};

export const actions = {
    async toggleFlag({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const parsed = ViewerActionParser.parseToggleFlag(form);

        if (!parsed) {
            return fail(400, { message: 'Invalid toggle parameters' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            return serviceContext.flagService.toggleFlag(
                parsed.videoId,
                parsed.kind,
                parsed.value
            );
        });
    },

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

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            const result = await serviceContext.watchService.createHistorySession(
                videoYoutubeId,
                watchSeconds
            );

            if (!result.ok) {
                return fail(result.status, { message: result.message });
            }

            return result;
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

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            const result = await serviceContext.watchService.updateHistoryProgress(
                videoYoutubeId,
                watchSeconds
            );

            if (!result.ok) {
                return fail(result.status, { message: result.message });
            }

            return result;
        });
    },

    async markWatched({ request, params, cookies }: { request: Request; params: { videoId: string }, cookies: any })
    {
        const videoYoutubeId = String(params.videoId || '').trim();
        if (!videoYoutubeId) return fail(400, { message: 'Missing videoId' });

        const form = await ServerActionForm.fromRequest(request);
        const intent = form.getTrimmedString('intent', 'watch');

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            const result = await serviceContext.watchService.setWatched(
                videoYoutubeId,
                intent !== 'unwatch'
            );

            if (!result.ok) {
                return fail(result.status, { message: result.message });
            }

            return result;
        });
    }
};
// apply-patch-anchor - do not delete