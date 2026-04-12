import type { PageServerLoad } from './$types';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';

export const load: PageServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(({ db }) => {
        // Resolve the active profile for viewer navigation context.
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);

        const gDao = new VirtualChannelDAO(db);
        const groups = gDao.list();

        return {
            groups,
            profileKey: profileContext.activeProfileKey
        };
    });
};
