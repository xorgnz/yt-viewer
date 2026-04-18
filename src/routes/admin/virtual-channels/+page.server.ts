import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { AdminVirtualChannelServiceContext } from '$lib/server/admin/AdminVirtualChannelServiceContext';

export const load: PageServerLoad = async () =>
{
    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
        return await serviceContext.indexService.loadPageData();
    });
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const name = form.getTrimmedString('name');
        if (!name) return fail(400, { message: 'Name is required' });

        const result = await ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            return await serviceContext.indexService.createVirtualChannel({ name });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    },

    rename: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const id = form.getPositiveInteger('id');
        const name = form.getTrimmedString('name');
        if (id === null || !name) return fail(400, { message: 'Invalid input' });

        const result = await ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            return await serviceContext.indexService.renameVirtualChannel({ id, name });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    },

    delete: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const id = form.getPositiveInteger('id');
        if (id === null) return fail(400, { message: 'Invalid id' });

        const result = await ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            return await serviceContext.indexService.deleteVirtualChannel({ id });
        });

        if (!result.ok) {
            return fail(result.error.status, { message: result.error.message });
        }

        throw redirect(303, result.data.redirectTo);
    },

    addAssociationInline: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const virtualChannelId = form.getPositiveInteger('virtual_channel_id');
        const sourceChannelId = form.getPositiveInteger('source_channel_id');

        if (!virtualChannelId) {
            return fail(400, { message: 'A valid virtual channel is required.', virtualChannelId: null });
        }

        if (!sourceChannelId) {
            return fail(400, { message: 'A valid source channel is required.', virtualChannelId });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.indexService.addInlineAssociation({
                virtualChannelId,
                sourceChannelId
            });

            if (!result.ok) {
                return fail(result.error.status, {
                    message: result.error.message,
                    virtualChannelId: result.error.virtualChannelId
                });
            }

            return result.data;
        });
    },

    removeAssociationInline: async ({ request }) => {
        const form = await ServerActionForm.fromRequest(request);
        const virtualChannelId = form.getPositiveInteger('virtual_channel_id');
        const sourceChannelId = form.getPositiveInteger('source_channel_id');

        if (!virtualChannelId) {
            return fail(400, { message: 'A valid virtual channel is required.', virtualChannelId: null });
        }

        if (!sourceChannelId) {
            return fail(400, { message: 'A valid source channel is required.', virtualChannelId });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.indexService.removeInlineAssociation({
                virtualChannelId,
                sourceChannelId
            });

            if (!result.ok) {
                return fail(result.error.status, {
                    message: result.error.message,
                    virtualChannelId: result.error.virtualChannelId
                });
            }

            return result.data;
        });
    }
};
