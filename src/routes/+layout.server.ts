import type { LayoutServerLoad } from './$types';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const load: LayoutServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(({ db }) => {
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
    });
};
