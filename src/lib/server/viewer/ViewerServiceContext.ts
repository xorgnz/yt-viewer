import { MySqlFlagsDAO } from '$lib/daos/flagsDAO';
import { MySqlHistoryDAO } from '$lib/daos/historyDAO';
import { MySqlProfileDAO } from '$lib/daos/profileDAO';
import { MySqlViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { MySqlVideoDAO } from '$lib/daos/videoDAO';
import { MySqlVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerFlagService } from '$lib/server/viewer/ViewerFlagService';
import { ViewerVirtualChannelService } from '$lib/server/viewer/ViewerVirtualChannelService';
import { ViewerWatchService } from '$lib/server/viewer/ViewerWatchService';

export class ViewerServiceContext
{
    readonly profileContext: ServerProfileContext;
    readonly flagService: ViewerFlagService;
    readonly watchService: ViewerWatchService;
    readonly virtualChannelService: ViewerVirtualChannelService;

    private constructor(
        profileContext: ServerProfileContext,
        flagService: ViewerFlagService,
        watchService: ViewerWatchService,
        virtualChannelService: ViewerVirtualChannelService
    )
    {
        this.profileContext = profileContext;
        this.flagService = flagService;
        this.watchService = watchService;
        this.virtualChannelService = virtualChannelService;
    }

    static async resolve(db: MySqlPoolWrapper, cookies: any): Promise<ViewerServiceContext>
    {
        const profileContext = await ServerProfileContext.resolve(new MySqlProfileDAO(db), cookies);
        const videoDAO = new MySqlVideoDAO(db);
        const viewerVideoReadRepository = new MySqlViewerVideoReadRepository(db);
        const flagsDAO = new MySqlFlagsDAO(db);
        const flagService = new ViewerFlagService(
            videoDAO,
            flagsDAO,
            profileContext.activeProfileId
        );
        const watchService = new ViewerWatchService(
            viewerVideoReadRepository,
            flagsDAO,
            new MySqlHistoryDAO(db),
            profileContext
        );
        const virtualChannelService = new ViewerVirtualChannelService(
            new MySqlVirtualChannelDAO(db),
            profileContext
        );

        return new ViewerServiceContext(
            profileContext,
            flagService,
            watchService,
            virtualChannelService
        );
    }
}
// apply-patch-anchor - do not delete