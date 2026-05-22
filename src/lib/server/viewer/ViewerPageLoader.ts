import { HistoryDAO } from '$lib/daos/historyDAO';
import { ViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';
import { ViewerVirtualChannelService } from '$lib/server/viewer/ViewerVirtualChannelService';

export class ViewerPageLoader
{
    private readonly viewerVideoReadRepository: ViewerVideoReadRepository;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly virtualChannelDAO: VirtualChannelDAO;
    private readonly historyDAO: HistoryDAO;

    constructor(db: DatabasePool)
    {
        this.viewerVideoReadRepository = new ViewerVideoReadRepository(db);
        this.sourceChannelDAO = new SourceChannelDAO(db);
        this.virtualChannelDAO = new VirtualChannelDAO(db);
        this.historyDAO = new HistoryDAO(db);
    }

    async load(filters: ViewerQueryFilters, profileContext: ServerProfileContext)
    {
        const virtualChannelService = new ViewerVirtualChannelService(
            this.virtualChannelDAO,
            this.historyDAO,
            profileContext
        );

        // Assemble the viewer page model from the normalized filters and current profile context.
        const [videos, totalCount, channels, virtualChannels] = await Promise.all([
            this.viewerVideoReadRepository.list(filters, profileContext.activeProfileId),
            this.viewerVideoReadRepository.count(filters, profileContext.activeProfileId),
            this.sourceChannelDAO.list(),
            virtualChannelService.loadVirtualChannels()
        ]);
        const activeVirtualChannel = filters.virtualChannelId == null
            ? null
            : virtualChannels.find((virtualChannel) => virtualChannel.id === filters.virtualChannelId) ?? null;

        return {
            filters,
            videos,
            totalCount,
            channels: channels.map((channel) => channel.toFields()),
            virtualChannels: virtualChannels.map((virtualChannel) => virtualChannel.toFields()),
            activeVirtualChannel: activeVirtualChannel?.toFields() ?? null,
            profileId: profileContext.activeProfileId,
            profileKey: profileContext.activeProfileKey,
            profileName: profileContext.activeProfileName
        };
    }
}
// apply-patch-anchor - do not delete
