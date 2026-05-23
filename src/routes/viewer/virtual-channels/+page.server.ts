import type { PageServerLoad } from './$types';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

export const load: PageServerLoad = async ({ cookies }) =>
{
    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = await ViewerServiceContext.resolve(db, cookies);
        const navigation = await serviceContext.virtualChannelService.loadNavigation();
        const virtualChannels = await serviceContext.virtualChannelService.loadVirtualChannels();

        return {
            profileKey: navigation.profileKey,
            virtualChannels: virtualChannels.map((virtualChannel) => virtualChannel.toFields())
        };
    });
};
// apply-patch-anchor - do not delete
