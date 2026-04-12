import { fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { ViewerLoadService } from '$lib/server/viewer/ViewerLoadService';
import { ViewerActionParser } from '$lib/server/viewer/ViewerActionParser';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load = async ({ url, cookies }: { url: URL; cookies: any }) =>
{
    return ServerDatabaseContext.run(({ db }) => {
        return new ViewerLoadService(db).load(url, cookies);
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

        return ServerDatabaseContext.run(({ db }) => {
            return ViewerServiceContext.resolve(db, cookies).flagService.toggleFlag(
                parsed.videoId,
                parsed.kind,
                parsed.value
            );
        });
    },

    async bulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const parsed = ViewerActionParser.parseBulkUpdateFlags(form);

        if (!parsed) {
            return fail(400, { message: 'Invalid bulk flag parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            return ViewerServiceContext.resolve(db, cookies).flagService.bulkUpdateFlags(parsed);
        });
    },

    async undoBulkUpdateFlags({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const parsed = ViewerActionParser.parseUndoBulkUpdateFlags(form);

        if (!parsed) {
            return fail(400, { message: 'Invalid bulk undo parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            return ViewerServiceContext.resolve(db, cookies).flagService.undoBulkUpdateFlags(parsed);
        });
    },

    async restoreSelectionState({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const parsed = ViewerActionParser.parseRestoreSelectionState(form);

        if (!parsed) {
            return fail(400, { message: 'Invalid restore parameters' });
        }

        return ServerDatabaseContext.run(({ db }) => {
            return ViewerServiceContext.resolve(db, cookies).flagService.restoreSelectionState(parsed);
        });
    }
};
