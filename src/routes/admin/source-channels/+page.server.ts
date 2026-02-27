import type { Actions, PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { redirect, fail } from '@sveltejs/kit';
import { YouTubeClient, YouTubeApiError } from '$lib/youtube/youTubeClient';
import { importChannelFromYouTube } from '$lib/youtube/importer';
import { env } from '$env/dynamic/private';

function getMode(): DatabaseMode
{
    if (env.NODE_ENV === 'test') return DatabaseMode.Test;
    if (env.NODE_ENV === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async () =>
{
    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        const dao = new SourceChannelDAO(db);
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
            const dao = new SourceChannelDAO(db);
            dao.upsert({ youtube_id, title, description, thumbnail_url, published_at } as any);
        } finally {
            dbw.close();
        }
        throw redirect(303, '/admin/source-channels');
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
            const dao = new SourceChannelDAO(db);
            const existing = dao.get(id);
            if (!existing) return fail(404, { message: 'SourceChannel not found.' });
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
        throw redirect(303, '/admin/source-channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'id is required.' });

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const dao = new SourceChannelDAO(db);
            dao.remove(id);
        } finally {
            dbw.close();
        }
        throw redirect(303, '/admin/source-channels');
    },

    refresh: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'id is required.' });

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const dao = new SourceChannelDAO(db);
            const existing = dao.get(id);
            if (!existing) return fail(404, { message: 'SourceChannel not found.' });

            // Instantiate YouTube client (requires YOUTUBE_API_KEY in env)
            let yt: YouTubeClient;
            try {
                yt = new YouTubeClient();
            } catch (e: any) {
                return fail(500, { message: e?.message || 'YouTube API key not configured.' });
            }

            try {
                const result = await importChannelFromYouTube(db, yt, existing.youtube_id);
                if (result.channelId === null) {
                    return fail(400, { message: 'Invalid or unknown YouTube channel ID. Please verify the ID starts with "UC" and is correct.' });
                }
                // Mark refresh time on success
                dao.markRefreshed(id, Date.now());
            } catch (e: any) {
                console.error('Refresh failed for channel', existing.youtube_id, e);

                if (e instanceof YouTubeApiError) {
                    const reasons = (e.errors || []).map(x => x.reason || '').join(',');
                    const blob = `${e.code}:${reasons}:${e.message}`;
                    const isQuota = /rateLimitExceeded|quotaExceeded/i.test(blob) || e.status === 429;
                    if (isQuota) {
                        return fail(429, { message: 'YouTube quota exceeded or rate limited. Please try again later.' });
                    }
                    if (e.status === 400 || e.status === 404) {
                        return fail(400, { message: 'Invalid request to YouTube. Please verify the channel ID and try again.' });
                    }
                    if (e.status >= 500) {
                        return fail(502, { message: 'YouTube service is temporarily unavailable. Please try again later.' });
                    }
                    return fail(502, { message: e.message || 'Failed to refresh from YouTube.' });
                }

                const name = (e && e.name) || '';
                if (name === 'AbortError') {
                    return fail(504, { message: 'Timed out contacting YouTube. Please try again.' });
                }
                return fail(502, { message: 'Network error contacting YouTube. Please try again later.' });
            }
        } finally {
            dbw.close();
        }

        throw redirect(303, '/admin/source-channels');
    }
};
