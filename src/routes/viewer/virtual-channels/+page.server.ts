import type { PageServerLoad } from './$types';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load: PageServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = await ViewerServiceContext.resolve(db, cookies);
        return serviceContext.virtualChannelService.loadNavigation();
    });
};
