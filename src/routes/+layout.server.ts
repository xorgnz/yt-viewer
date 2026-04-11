import type { LayoutServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

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
        const profileContext = ServerProfileContext.resolve(profileDAO, cookies);
        const adminSession = ServerAdminSession.resolve(cookies);

        return {
            profiles: profileDAO.list(),
            activeProfileKey: profileContext.activeProfileKey,
            activeProfileName: profileContext.activeProfileName,
            isAdminLoggedIn: adminSession.isLoggedIn
        };
    } finally {
        wrapper.close();
    }
};
