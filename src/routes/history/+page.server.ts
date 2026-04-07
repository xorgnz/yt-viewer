import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load = async ({ url, cookies }: { url: URL; cookies: any }) =>
{
    // Filters: mode, channelId, dateFrom, dateTo, pagination
    const profileKey = getActiveProfileKey(cookies);
    const modeRaw = url.searchParams.get('mode');
    const channelId = url.searchParams.get('channelId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const mode = modeRaw === 'videos' ? 'videos' : 'sessions';

    const filters = {
        profileKey,
        mode,
        channelId: channelId ? Number(channelId) : null,
        dateFrom: dateFrom ? Number(dateFrom) : null,
        dateTo: dateTo ? Number(dateTo) : null,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0
    } as const;

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Resolve history against the active site-wide profile.
        const pDao = new ProfileDAO(db);
        ensureProfiles(pDao);

        const profile = pDao.getByKey(filters.profileKey) || pDao.getByKey('default');
        const profileId = profile!.id;

        const hDao = new HistoryDAO(db);
        const cDao = new SourceChannelDAO(db);

        const queryFilters = {
            profileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: filters.limit,
            offset: filters.offset
        };
        const items = filters.mode === 'videos'
            ? hDao.listVideoSummariesWithFilters(queryFilters)
            : hDao.listSessionsWithFilters(queryFilters);

        const channels = cDao.list();

        return {
            filters,
            items,
            channels,
            profileId,
            profileName: profile!.name
        };
    }
    finally {
        dbw.close();
    }
};
