import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { fail, redirect } from '@sveltejs/kit';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

function parseDateOnly(value: string | null, boundary: 'start' | 'end'): number | null
{
    if (!value) {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (boundary === 'start') {
        return new Date(year, month, day, 0, 0, 0, 0).getTime();
    }

    return new Date(year, month, day, 23, 59, 59, 999).getTime();
}

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ url, cookies }: { url: URL; cookies: any }) =>
{
    const term = url.searchParams.get('term') || undefined;
    const profileKey = getActiveProfileKey(cookies);
    const watchedParamRaw = url.searchParams.get('watched');
    const unwatchedOnly = url.searchParams.get('unwatchedOnly');
    const watchedParam = unwatchedOnly === '1'
        ? 'unwatched'
        : (watchedParamRaw ?? (profileKey === 'child' ? 'unwatched' : 'all'));
    const watched = (watchedParam === 'watched' || watchedParam === 'unwatched') ? watchedParam : 'all';
    const showIgnored = url.searchParams.get('showIgnored');
    const ignoredParam = showIgnored === '1' ? 'show' : (url.searchParams.get('ignored') || 'hide');
    const ignored = (ignoredParam === 'show') ? 'show' : 'hide';
    const dateFromInput = url.searchParams.get('dateFrom')?.trim() || '';
    const dateToInput = url.searchParams.get('dateTo')?.trim() || '';
    const channelId = url.searchParams.get('channelId');
    const groupId = url.searchParams.get('groupId');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
        term,
        watched: watched as 'all' | 'watched' | 'unwatched',
        ignored: ignored as 'hide' | 'show',
        dateFrom: parseDateOnly(dateFromInput, 'start'),
        dateTo: parseDateOnly(dateToInput, 'end'),
        dateFromInput,
        dateToInput,
        channelId: channelId ? Number(channelId) : null,
        groupId: groupId ? Number(groupId) : null,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0
    } as const;

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Resolve the site-wide active profile before loading profile-scoped viewer state.
        const pDao = new ProfileDAO(db);
        ensureProfiles(pDao);
        const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
        const profileId = profile!.id;

        const vDao = new VideoDAO(db);
        const cDao = new SourceChannelDAO(db);
        const gDao = new VirtualChannelDAO(db);

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
            profileId,
            profileKey,
            profileName: profile!.name
        };
    } finally {
        dbw.close();
    }
};

export const actions = {
    async toggleFlag({ request, url, cookies }: { request: Request; url: URL; cookies: any })
    {
        const form = await request.formData();
        const videoIdStr = String(form.get('videoId') || '').trim();
        const kind = String(form.get('kind') || '').trim(); // 'favorite' | 'ignored'
        const valueStr = String(form.get('value') || '').trim(); // '0' | '1'
        const profileKey = getActiveProfileKey(cookies);

        const videoId = Number(videoIdStr);
        const value = valueStr === '1' ? 1 : (valueStr === '0' ? 0 : NaN);

        if (!videoId || Number.isNaN(videoId) || (kind !== 'favorite' && kind !== 'ignored') || Number.isNaN(value)) {
            return fail(400, { message: 'Invalid toggle parameters' });
        }

        const dbw = new DatabaseWrapper(getMode());
        const db = dbw.open();
        try {
            const pDao = new ProfileDAO(db);
            ensureProfiles(pDao);
            const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');
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
