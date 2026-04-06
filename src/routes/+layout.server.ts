import type { LayoutServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ensureProfiles, getActiveProfileKey } from '$lib/profiles';

function getMode(): DatabaseMode
{
    const env = process.env.NODE_ENV || 'development';
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: LayoutServerLoad = async ({ cookies }) =>
{
    const wrapper = new DatabaseWrapper(getMode());
    const db = wrapper.open();

    try {
        // Resolve the site-wide active profile once so pages can treat it as current identity.
        const profileDAO = new ProfileDAO(db);
        ensureProfiles(profileDAO);
        const profiles = profileDAO.list();
        const activeProfileKey = getActiveProfileKey(cookies);
        const activeProfile = profileDAO.getByKey(activeProfileKey) || profileDAO.getByKey('default');

        return {
            profiles,
            activeProfileKey: activeProfile?.key || 'default',
            activeProfileName: activeProfile?.name || 'Adult'
        };
    } finally {
        wrapper.close();
    }
};
