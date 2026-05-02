import { error, fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { ViewerActionParser } from '$lib/server/viewer/ViewerActionParser';
import { ViewerQueryParser } from '$lib/server/viewer/ViewerQueryParser';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load = async ({ params, cookies, url }: { params: { videoId: string }, cookies: any, url: URL }) =>
{
    const videoId = String(params.videoId || '').trim();
    if (!videoId) throw error(400, 'Missing videoId');

    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = await ViewerServiceContext.resolve(db, cookies);
        const filters = ViewerQueryParser.parse(url, serviceContext.profileContext.activeProfileKey);
        const result = await serviceContext.watchService.load(videoId, filters);
        if (!result.ok) {
            throw error(result.status, result.message);
        }

        return result.data;
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
        const groupId = form.getPositiveInteger('groupId');
        const watchSeconds = form.getNumber('watchSeconds', 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds <= 5) {
            return fail(400, { message: 'Insufficient watch time for history session' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            const result = await serviceContext.watchService.createHistorySession(
                videoYoutubeId,
                watchSeconds,
                groupId
            );

            if (!result.ok) {
                if (result.code === 'timer_capped') {
                    return new Response(JSON.stringify({
                        message: result.message,
                        code: result.code
                    }), {
                        status: result.status,
                        headers: {
                            'content-type': 'application/json',
                            'x-viewer-timer-state': 'capped'
                        }
                    });
                }

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
        const groupId = form.getPositiveInteger('groupId');
        const watchSeconds = form.getNumber('watchSeconds', 0);
        if (!Number.isFinite(watchSeconds) || watchSeconds < 0) {
            return fail(400, { message: 'Invalid watch time' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = await ViewerServiceContext.resolve(db, cookies);
            const result = await serviceContext.watchService.updateHistoryProgress(
                videoYoutubeId,
                watchSeconds,
                groupId
            );

            if (!result.ok) {
                if (result.code === 'timer_capped') {
                    return new Response(JSON.stringify({
                        message: result.message,
                        code: result.code
                    }), {
                        status: result.status,
                        headers: {
                            'content-type': 'application/json',
                            'x-viewer-timer-state': 'capped'
                        }
                    });
                }

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
