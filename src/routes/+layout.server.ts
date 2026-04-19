import type { LayoutServerLoad } from './$types';
import { PostgresProfileDAO } from '$lib/daos/profileDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const load: LayoutServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(async ({ db }) => {
        // Resolve the site-wide active profile once so pages can treat it as current identity.
        const profileDAO = new PostgresProfileDAO(db);
        const profileContext = await ServerProfileContext.resolve(profileDAO, cookies);

        return {
            profiles: await profileDAO.list(),
            activeProfileKey: profileContext.activeProfileKey,
            activeProfileName: profileContext.activeProfileName,
            isAdminLoggedIn: ServerAdminSession.isLoggedIn(cookies)
        };
    });
};
// apply-patch-anchor - do not delete