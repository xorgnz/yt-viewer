import { FlagsDAO } from '$lib/daos/flagsDAO';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { VideoDAO } from '$lib/daos/videoDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
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

    static async resolve(db: DatabasePool, cookies: any): Promise<ViewerServiceContext>
    {
        const profileContext = await ServerProfileContext.resolve(new ProfileDAO(db), cookies);
        const videoDAO = new VideoDAO(db);
        const viewerVideoReadRepository = new ViewerVideoReadRepository(db);
        const flagsDAO = new FlagsDAO(db);
        const flagService = new ViewerFlagService(
            videoDAO,
            flagsDAO,
            profileContext.activeProfileId
        );
        const watchService = new ViewerWatchService(
            viewerVideoReadRepository,
            flagsDAO,
            new HistoryDAO(db),
            profileContext
        );
        const virtualChannelService = new ViewerVirtualChannelService(
            new VirtualChannelDAO(db),
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