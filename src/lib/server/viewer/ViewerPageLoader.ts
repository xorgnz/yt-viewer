import type Database from 'better-sqlite3';
import { ViewerVideoReadRepository } from '$lib/daos/readers/ViewerVideoReadRepository';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerPageLoader
{
    private readonly viewerVideoReadRepository: ViewerVideoReadRepository;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly virtualChannelDAO: VirtualChannelDAO;

    constructor(db: Database.Database)
    {
        this.viewerVideoReadRepository = new ViewerVideoReadRepository(db);
        this.sourceChannelDAO = new SourceChannelDAO(db);
        this.virtualChannelDAO = new VirtualChannelDAO(db);
    }

    load(filters: ViewerQueryFilters, profileContext: ServerProfileContext)
    {
        // Assemble the viewer page model from the normalized filters and current profile context.
        const videos = this.viewerVideoReadRepository.list(filters, profileContext.activeProfileId);
        const totalCount = this.viewerVideoReadRepository.count(filters, profileContext.activeProfileId);
        const channels = this.sourceChannelDAO.list();
        const groups = this.virtualChannelDAO.list();

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
