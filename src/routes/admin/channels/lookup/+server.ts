import type { RequestHandler } from './$types';
import { YouTubeClient, YouTubeApiError } from '$lib/youtube/youTubeClient';
import { fetchChannelMetadata } from '$lib/youtube/fetch';

export const GET: RequestHandler = async ({ url }) =>
{
    const youtubeId = String(url.searchParams.get('youtube_id') || '').trim();
    if (!youtubeId) {
        return new Response(JSON.stringify({ ok: false, error: 'youtube_id is required' }), { status: 400 });
    }

    let yt: YouTubeClient;
    try {
        yt = new YouTubeClient();
    } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || 'YouTube API key not configured.' }), { status: 500 });
    }

    try {
        const item = await fetchChannelMetadata(yt, youtubeId);
        console.log(item);
        if (!item) {
            return new Response(JSON.stringify({ ok: false, error: 'Channel not found for the provided ID.' }), { status: 404 });
        }

        const snippet = item.snippet || {};
        const thumbs = snippet.thumbnails || {} as any;
        const thumbUrl = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || null;
        const publishedAtMs = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

        return new Response(
            JSON.stringify({
                ok: true,
                data: {
                    youtube_id: item.id,
                    title: snippet.title || '',
                    description: snippet.description || '',
                    thumbnail_url: thumbUrl,
                    published_at: Number.isFinite(publishedAtMs as any) ? publishedAtMs : null
                }
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
        );
    } catch (e: any) {
        if (e instanceof YouTubeApiError) {
            const reasons = (e.errors || []).map(x => x.reason || '').join(',');
            const blob = `${e.code}:${reasons}:${e.message}`;
            const isQuota = /rateLimitExceeded|quotaExceeded/i.test(blob) || e.status === 429;
            const status = isQuota ? 429 : (e.status >= 400 && e.status < 600 ? e.status : 502);
            return new Response(JSON.stringify({ ok: false, error: e.message }), { status });
        }
        const name = (e && e.name) || '';
        if (name === 'AbortError') {
            return new Response(JSON.stringify({ ok: false, error: 'Timed out contacting YouTube.' }), { status: 504 });
        }
        return new Response(JSON.stringify({ ok: false, error: 'Network error contacting YouTube.' }), { status: 502 });
    }
};
