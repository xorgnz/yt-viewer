import type { PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ cookies }) =>
{
    const dbw = new DatabaseWrapper(envToMode());
    const db = dbw.open();
    try {
        // Resolve the active profile for viewer navigation context.
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

        const gDao = new VirtualChannelDAO(db);
        const groups = gDao.list();

        return {
            groups,
            profileKey: profileContext.activeProfileKey
        };
    } finally {
        dbw.close();
    }
};
