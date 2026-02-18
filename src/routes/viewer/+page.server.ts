import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ChannelDAO } from '$lib/daos/channelDAO';
import { ChannelGroupDAO } from '$lib/daos/channelGroupDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';

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
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const channelId = url.searchParams.get('channelId');
    const groupId = url.searchParams.get('groupId');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
        term,
        watched: watched as 'all' | 'watched' | 'unwatched',
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
