import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { AdminSourceChannelServiceContext } from '$lib/server/admin/AdminSourceChannelServiceContext';
import type { AdminSourceChannelPageService } from '$lib/server/admin/AdminSourceChannelPageService';

function withPageService<T>(work: (pageService: AdminSourceChannelPageService) => T | Promise<T>): Promise<T>
{
    return ServerDatabaseContext.run(({ db }) => {
        return work(AdminSourceChannelServiceContext.resolve(db).pageService);
    });
}

export const load: PageServerLoad = async () =>
{
    return withPageService((pageService) => {
        return pageService.loadPageData();
    });
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const youtubeInput = form.getTrimmedString('youtube_id');
        const title = form.getTrimmedString('title');
        const description = form.getString('description');
        const thumbnail_url = form.getString('thumbnail_url') || null;
        const publishedAtText = form.getTrimmedString('published_at');
        const published_at = publishedAtText ? Number(publishedAtText) : null;

        if (!youtubeInput || !title) {
            return fail(400, { message: 'youtube_id and title are required.' });
        }

        const result = await withPageService((pageService) => {
            return pageService.createSourceChannel({
                youtubeInput,
                title,
                description,
                thumbnail_url,
                published_at
            });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    },

    update: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const id = form.getPositiveInteger('id');
        const title = form.getTrimmedString('title');
        const description = form.getString('description');
        const thumbnail_url = form.getString('thumbnail_url') || null;
        const publishedAtText = form.getTrimmedString('published_at');
        const published_at = publishedAtText ? Number(publishedAtText) : null;

        if (id === null || !title) {
            return fail(400, { message: 'id and title are required.' });
        }

        const result = await withPageService((pageService) => {
            return pageService.updateSourceChannel({
                id,
                title,
                description,
                thumbnail_url,
                published_at
            });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    },

    delete: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const id = form.getPositiveInteger('id');
        if (id === null) return fail(400, { message: 'id is required.' });

        const result = await withPageService((pageService) => {
            return pageService.deleteSourceChannel({ id });
        });

        throw redirect(303, result.redirectTo);
    },

    refresh: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const id = form.getPositiveInteger('id');
        if (id === null) return fail(400, { message: 'id is required.' });

        const result = await withPageService((pageService) => {
            return pageService.refreshSourceChannel({ id });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    }
};
// apply-patch-anchor - do not delete