import { PostgresViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import { PostgresSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { PostgresVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerPageLoader
{
    private readonly viewerVideoReadRepository: PostgresViewerVideoReadRepository;
    private readonly sourceChannelDAO: PostgresSourceChannelDAO;
    private readonly virtualChannelDAO: PostgresVirtualChannelDAO;

    constructor(db: PostgresPoolWrapper)
    {
        this.viewerVideoReadRepository = new PostgresViewerVideoReadRepository(db);
        this.sourceChannelDAO = new PostgresSourceChannelDAO(db);
        this.virtualChannelDAO = new PostgresVirtualChannelDAO(db);
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