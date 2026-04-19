import { ViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerPageLoader
{
    private readonly viewerVideoReadRepository: ViewerVideoReadRepository;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly virtualChannelDAO: VirtualChannelDAO;

    constructor(db: DatabasePool)
    {
        this.viewerVideoReadRepository = new ViewerVideoReadRepository(db);
        this.sourceChannelDAO = new SourceChannelDAO(db);
        this.virtualChannelDAO = new VirtualChannelDAO(db);
    }

    async load(filters: ViewerQueryFilters, profileContext: ServerProfileContext)
    {
        // Assemble the viewer page model from the normalized filters and current profile context.
        const [videos, totalCount, channels, groups] = await Promise.all([
            this.viewerVideoReadRepository.list(filters, profileContext.activeProfileId),
            this.viewerVideoReadRepository.count(filters, profileContext.activeProfileId),
            this.sourceChannelDAO.list(),
            this.virtualChannelDAO.list()
        ]);

        return {
            filters,
            videos,
            totalCount,
            channels,
            groups,
            profileId: profileContext.activeProfileId,
            profileKey: profileContext.activeProfileKey,
            profileName: profileContext.activeProfileName
        };
    }
}
// apply-patch-anchor - do not delete