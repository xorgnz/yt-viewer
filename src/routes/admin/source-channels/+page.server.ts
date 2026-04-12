import type { Actions, PageServerLoad } from './$types';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { redirect, fail } from '@sveltejs/kit';
import { YouTubeClient, YouTubeApiError } from '$lib/youtube/youTubeClient';
import { importChannelFromYouTube } from '$lib/youtube/importer';
import { resolveChannelReference } from '$lib/youtube/fetch';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';

export const load: PageServerLoad = async () =>
{
    return ServerDatabaseContext.run(({ db }) => {
        const dao = new SourceChannelDAO(db);
        const channels = dao.list();
        return { channels };
    });
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await request.formData();
        const youtubeInput = String(form.get('youtube_id') || '').trim();
        const title = String(form.get('title') || '').trim();
        const description = String(form.get('description') || '');
        const thumbnail_url = String(form.get('thumbnail_url') || '') || null;
        const published_at_str = String(form.get('published_at') || '').trim();
        const published_at = published_at_str ? Number(published_at_str) : null;

        if (!youtubeInput || !title) {
            return fail(400, { message: 'youtube_id and title are required.' });
        }

        let yt: YouTubeClient;
        try {
            yt = new YouTubeClient();
        } catch (e: any) {
            return fail(500, { message: e?.message || 'YouTube API key not configured.' });
        }

        const resolved = await resolveChannelReference(yt, youtubeInput);
        if (!resolved.channelId) {
            return fail(400, { message: 'Enter a valid YouTube channel ID, handle, or channel URL.' });
        }

        await ServerDatabaseContext.run(({ db }) => {
            const dao = new SourceChannelDAO(db);
            dao.upsert({
                youtube_id: resolved.channelId,
                title,
                description,
                thumbnail_url,
                published_at
            } as any);
        });
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

        const result = await ServerDatabaseContext.run(({ db }) => {
            const dao = new SourceChannelDAO(db);
            const existing = dao.get(id);
            if (!existing) {
                return fail(404, { message: 'SourceChannel not found.' });
            }

            dao.upsert({
                youtube_id: existing.youtube_id,
                title,
                description,
                thumbnail_url,
                published_at
            } as any);
            return null;
        });

        if (result) {
            return result;
        }
        throw redirect(303, '/admin/source-channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'id is required.' });

        await ServerDatabaseContext.run(({ db }) => {
            const dao = new SourceChannelDAO(db);
            dao.remove(id);
        });
        throw redirect(303, '/admin/source-channels');
    },

    refresh: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'id is required.' });

        const result = await ServerDatabaseContext.run(async ({ db }) => {
            const dao = new SourceChannelDAO(db);
            const existing = dao.get(id);
            if (!existing) {
                return fail(404, { message: 'SourceChannel not found.' });
            }

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
            return null;
        });

        if (result) {
            return result;
        }

        throw redirect(303, '/admin/source-channels');
    }
};
