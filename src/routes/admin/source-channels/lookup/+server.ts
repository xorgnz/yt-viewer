import type { RequestHandler } from './$types';
import { AdminSourceChannelServiceContext } from '$lib/server/admin/AdminSourceChannelServiceContext';

export const GET: RequestHandler = async ({ url }) =>
{
    const youtubeId = String(url.searchParams.get('youtube_id') || '').trim();
    if (!youtubeId) {
        return new Response(JSON.stringify({ ok: false, error: 'youtube_id is required' }), { status: 400 });
    }

    const result = await AdminSourceChannelServiceContext
        .resolveLookupService()
        .lookupSourceChannel({ youtubeInput: youtubeId });
    if (!result.ok) {
        return new Response(
            JSON.stringify({ ok: false, error: result.error.message }),
            { status: result.error.status }
        );
    }

    return new Response(
        JSON.stringify({
            ok: true,
            data: result.data
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
    );
};
// apply-patch-anchor - do not delete