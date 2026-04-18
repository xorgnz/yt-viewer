import { PostgresFlagsDAO } from '$lib/daos/flagsDAO';
import { PostgresHistoryDAO } from '$lib/daos/historyDAO';
import { PostgresProfileDAO } from '$lib/daos/profileDAO';
import { PostgresViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { PostgresVideoDAO } from '$lib/daos/videoDAO';
import { PostgresVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
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

    static async resolve(db: PostgresPoolWrapper, cookies: any): Promise<ViewerServiceContext>
    {
        const profileContext = await ServerProfileContext.resolve(new PostgresProfileDAO(db), cookies);
        const videoDAO = new PostgresVideoDAO(db);
        const viewerVideoReadRepository = new PostgresViewerVideoReadRepository(db);
        const flagsDAO = new PostgresFlagsDAO(db);
        const flagService = new ViewerFlagService(
            videoDAO,
            flagsDAO,
            profileContext.activeProfileId
        );
        const watchService = new ViewerWatchService(
            viewerVideoReadRepository,
            flagsDAO,
            new PostgresHistoryDAO(db),
            profileContext
        );
        const virtualChannelService = new ViewerVirtualChannelService(
            new PostgresVirtualChannelDAO(db),
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
