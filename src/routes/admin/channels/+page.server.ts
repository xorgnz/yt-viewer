import type { Actions, PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { ChannelDAO } from '$lib/daos/channelDAO';
import { redirect, fail } from '@sveltejs/kit';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async () =>
{
    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        const dao = new ChannelDAO(db);
        const channels = dao.list();
        return { channels };
    } finally {
        dbw.close();
    }
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await request.formData();
        const youtube_id = String(form.get('youtube_id') || '').trim();
        const title = String(form.get('title') || '').trim();
        const description = String(form.get('description') || '');
        const thumbnail_url = String(form.get('thumbnail_url') || '') || null;
        const published_at_str = String(form.get('published_at') || '').trim();
        const published_at = published_at_str ? Number(published_at_str) : null;

        if (!youtube_id || !title) {
            return fail(400, { message: 'youtube_id and title are required.' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const dao = new ChannelDAO(db);
            dao.upsert({ youtube_id, title, description, thumbnail_url, published_at } as any);
        } finally {
            dbw.close();
        }
        throw redirect(303, '/admin/channels');
    },

    update: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        const title = String(form.get('title') || '').trim();
        const description = String(form.get('description') || '');
        const thumbnail_url = String(form.get('thumbnail_url') || '') || null;
        const published_at_str = String(form.get('published_at') || '').trim();
        const published_at = published_at_str ? Number(published_at_str) : null;

        if (!id || !title) {
            return fail(400, { message: 'id and title are required.' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const dao = new ChannelDAO(db);
            const existing = dao.get(id);
            if (!existing) return fail(404, { message: 'Channel not found.' });
            dao.upsert({
                youtube_id: existing.youtube_id,
                title,
                description,
                thumbnail_url,
                published_at
            } as any);
        } finally {
            dbw.close();
        }
        throw redirect(303, '/admin/channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'id is required.' });

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const dao = new ChannelDAO(db);
            dao.remove(id);
        } finally {
            dbw.close();
        }
        throw redirect(303, '/admin/channels');
    }
};
