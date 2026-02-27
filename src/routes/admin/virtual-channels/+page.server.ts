import type { Actions, PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { redirect, fail } from '@sveltejs/kit';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async () =>
{
    const wrapper = new DatabaseWrapper(envToMode());
    const db = wrapper.open();
    const dao = new VirtualChannelDAO(db);
    const groups = dao.list();
    return { groups };
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await request.formData();
        const name = String(form.get('name') || '').trim();
        if (!name) return fail(400, { message: 'Name is required' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.create(name);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to create group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    },

    rename: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        const name = String(form.get('name') || '').trim();
        if (!id || !name) return fail(400, { message: 'Invalid input' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.rename(id, name);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to rename group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'Invalid id' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.remove(id);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to delete group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    }
};
