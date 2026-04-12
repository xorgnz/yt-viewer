import type { PageServerLoad } from './$types';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load: PageServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(({ db }) => {
        return ViewerServiceContext.resolve(db, cookies).virtualChannelService.loadNavigation();
    });
};
