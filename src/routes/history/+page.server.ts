import { PostgresProfileDAO } from '$lib/daos/profileDAO';
import { PostgresHistoryReadRepository } from '$lib/daos/readers/HistoryReadRepository';
import { PostgresSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';

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

    return ServerDatabaseContext.run(async ({ db }) => {
        // Resolve history against the active site-wide profile.
        const profileContext = await ServerProfileContext.resolve(new PostgresProfileDAO(db), cookies);
        const filters = {
            profileKey: profileContext.activeProfileKey,
            mode,
            channelId: channelId ? Number(channelId) : null,
            dateFrom: dateFrom ? Number(dateFrom) : null,
            dateTo: dateTo ? Number(dateTo) : null,
            limit: limit ? Number(limit) : 100,
            offset: offset ? Number(offset) : 0
        } as const;

        const historyReadRepository = new PostgresHistoryReadRepository(db);
        const cDao = new PostgresSourceChannelDAO(db);

        const queryFilters = {
            profileId: profileContext.activeProfileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: filters.limit,
            offset: filters.offset
        };
        const items = filters.mode === 'videos'
            ? historyReadRepository.listVideoSummaries(queryFilters)
            : historyReadRepository.listSessions(queryFilters);
        const sessionItems = await historyReadRepository.listSessions({
            profileId: profileContext.activeProfileId,
            channelId: filters.channelId ?? undefined,
            dateFrom: filters.dateFrom ?? undefined,
            dateTo: filters.dateTo ?? undefined,
            limit: 1000,
            offset: 0
        });

        const channels = await cDao.list();

        return {
            filters,
            items: await items,
            sessionItems,
            channels,
            profileId: profileContext.activeProfileId,
            profileName: profileContext.activeProfileName
        };
    });
};
