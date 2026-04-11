import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';

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
    const modeRaw = url.searchParams.get('mode');
    const channelId = url.searchParams.get('channelId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const mode = modeRaw === 'videos' ? 'videos' : 'sessions';

    const dbw = new DatabaseWrapper(getMode());
    const db = dbw.open();
    try {
        // Resolve history against the active site-wide profile.
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);
        const filters = {
            profileKey: profileContext.activeProfileKey,
            mode,
            channelId: channelId ? Number(channelId) : null,
            dateFrom: dateFrom ? Number(dateFrom) : null,
            dateTo: dateTo ? Number(dateTo) : null,
            limit: limit ? Number(limit) : 100,
            offset: offset ? Number(offset) : 0
        } as const;

        const hDao = new HistoryDAO(db);
        const cDao = new SourceChannelDAO(db);

        const queryFilters = {
            profileId: profileContext.activeProfileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: filters.limit,
            offset: filters.offset
        };
        const items = filters.mode === 'videos'
            ? hDao.listVideoSummariesWithFilters(queryFilters)
            : hDao.listSessionsWithFilters(queryFilters);
        const sessionItems = hDao.listSessionsWithFilters({
            profileId: profileContext.activeProfileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: 1000,
            offset: 0
        });

        const channels = cDao.list();

        return {
            filters,
            items,
            sessionItems,
            channels,
            profileId: profileContext.activeProfileId,
            profileName: profileContext.activeProfileName
        };
    }
    finally {
        dbw.close();
    }
};
