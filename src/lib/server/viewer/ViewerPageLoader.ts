import { MySqlViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import { MySqlSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { MySqlVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerPageLoader
{
    private readonly viewerVideoReadRepository: MySqlViewerVideoReadRepository;
    private readonly sourceChannelDAO: MySqlSourceChannelDAO;
    private readonly virtualChannelDAO: MySqlVirtualChannelDAO;

    constructor(db: MySqlPoolWrapper)
    {
        this.viewerVideoReadRepository = new MySqlViewerVideoReadRepository(db);
        this.sourceChannelDAO = new MySqlSourceChannelDAO(db);
        this.virtualChannelDAO = new MySqlVirtualChannelDAO(db);
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