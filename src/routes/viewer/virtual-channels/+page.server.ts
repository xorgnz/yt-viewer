import type { PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ cookies }) =>
{
    const profileKey = getActiveProfileKey(cookies);

    const dbw = new DatabaseWrapper(envToMode());
    const db = dbw.open();
    try {
        // Resolve the active profile for viewer navigation context.
        const pDao = new ProfileDAO(db);
        ensureProfiles(pDao);
        const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');

        const gDao = new VirtualChannelDAO(db);
        const groups = gDao.list();

        return {
            groups,
            profileKey: profile!.key
        };
    } finally {
        dbw.close();
    }
};
