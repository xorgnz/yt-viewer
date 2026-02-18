import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ChannelDAO } from '$lib/daos/channelDAO';
import { ChannelGroupDAO } from '$lib/daos/channelGroupDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { fail, redirect } from '@sveltejs/kit';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ url }: { url: URL }) =>
{
    const term = url.searchParams.get('term') || undefined;
    const watchedParam = url.searchParams.get('watched') || 'all';
    const watched = (watchedParam === 'watched' || watchedParam === 'unwatched') ? watchedParam : 'all';
    const ignoredParam = url.searchParams.get('ignored') || 'hide';
    const ignored = (ignoredParam === 'show') ? 'show' : 'hide';
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const channelId = url.searchParams.get('channelId');
    const groupId = url.searchParams.get('groupId');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
        term,
        watched: watched as 'all' | 'watched' | 'unwatched',
        ignored: ignored as 'hide' | 'show',
        dateFrom: dateFrom ? Number(dateFrom) : null,
        dateTo: dateTo ? Number(dateTo) : null,
        channelId: channelId ? Number(channelId) : null,
        groupId: groupId ? Number(groupId) : null,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0
    } as const;

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Ensure a default profile exists for viewer features
        const pDao = new ProfileDAO(db);
        pDao.upsertByKey('default', 'Default');
        const profile = pDao.getByKey('default');
        const profileId = profile!.id;

        const vDao = new VideoDAO(db);
        const cDao = new ChannelDAO(db);
        const gDao = new ChannelGroupDAO(db);

        const [videos, channels, groups] = [
            vDao.listForViewer(filters as any, profileId),
            cDao.list(),
            gDao.list()
        ];

        return {
            filters,
            videos,
            channels,
            groups,
            profileId
        };
    } finally {
        dbw.close();
    }
};

export const actions = {
    async toggleFlag({ request, url }: { request: Request; url: URL })
    {
        const form = await request.formData();
        const videoIdStr = String(form.get('videoId') || '').trim();
        const kind = String(form.get('kind') || '').trim(); // 'favorite' | 'ignored'
        const valueStr = String(form.get('value') || '').trim(); // '0' | '1'

        const videoId = Number(videoIdStr);
        const value = valueStr === '1' ? 1 : (valueStr === '0' ? 0 : NaN);

        if (!videoId || Number.isNaN(videoId) || (kind !== 'favorite' && kind !== 'ignored') || Number.isNaN(value)) {
            return fail(400, { message: 'Invalid toggle parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            pDao.upsertByKey('default', 'Default');
            const profile = pDao.getByKey('default');
            const profileId = profile!.id;

            const flags = new FlagsDAO(db);
            if (kind === 'favorite') {
                flags.set(videoId, profileId, { favorite: value as 0 | 1 });
            } else if (kind === 'ignored') {
                flags.set(videoId, profileId, { ignored: value as 0 | 1 });
            }
        } finally {
            dbw.close();
        }

        // Stay on the same page with same query params
        throw redirect(303, `/viewer?${url.searchParams.toString()}`);
    }
};
