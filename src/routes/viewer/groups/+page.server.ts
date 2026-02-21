import type { PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { ChannelGroupDAO } from '$lib/daos/channelGroupDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ url }) =>
{
    const profileKey = (url.searchParams.get('profile') || 'default').trim();

    const dbw = new DatabaseWrapper(envToMode());
    const db = dbw.open();
    try {
        // Ensure profiles exist and resolve passed profile key
        const pDao = new ProfileDAO(db);
        pDao.upsertByKey('default', 'Default');
        pDao.upsertByKey('child', 'Child');
        const profile = pDao.getByKey(profileKey) || pDao.getByKey('default');

        const gDao = new ChannelGroupDAO(db);
        const groups = gDao.list();

        return {
            groups,
            profileKey: profile!.key
        };
    } finally {
        dbw.close();
    }
};
