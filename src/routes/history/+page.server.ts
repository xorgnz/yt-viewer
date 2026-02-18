import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ChannelDAO } from '$lib/daos/channelDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ url }: { url: URL }) =>
{
    // Filters: profile (by key), channelId, dateFrom, dateTo, pagination
    const profileKey = (url.searchParams.get('profile') || 'default').trim();
    const channelId = url.searchParams.get('channelId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
        profileKey,
        channelId: channelId ? Number(channelId) : null,
        dateFrom: dateFrom ? Number(dateFrom) : null,
        dateTo: dateTo ? Number(dateTo) : null,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0
    } as const;

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Ensure profiles exist (default + child as per PRD)
        const pDao = new ProfileDAO(db);
        pDao.upsertByKey('default', 'Default');
        pDao.upsertByKey('child', 'Child');

        const profile = pDao.getByKey(filters.profileKey) || pDao.getByKey('default');
        const profileId = profile!.id;

        const hDao = new HistoryDAO(db);
        const cDao = new ChannelDAO(db);

        const items = hDao.listWithFilters({
            profileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: filters.limit,
            offset: filters.offset
        });

        // Channels list to support filtering UI in next task
        const channels = cDao.list();

        return {
            filters,
            items,
            channels,
            profileId
        };
    }
    finally {
        dbw.close();
    }
};
