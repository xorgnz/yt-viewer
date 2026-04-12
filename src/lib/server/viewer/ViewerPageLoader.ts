import type Database from 'better-sqlite3';
import { VideoDAO } from '$lib/daos/videoDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerQueryFilters } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerPageLoader
{
    private readonly videoDAO: VideoDAO;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly virtualChannelDAO: VirtualChannelDAO;

    constructor(db: Database.Database)
    {
        this.videoDAO = new VideoDAO(db);
        this.sourceChannelDAO = new SourceChannelDAO(db);
        this.virtualChannelDAO = new VirtualChannelDAO(db);
    }

    load(filters: ViewerQueryFilters, profileContext: ServerProfileContext)
    {
        // Assemble the viewer page model from the normalized filters and current profile context.
        const videos = this.videoDAO.listForViewer(filters, profileContext.activeProfileId);
        const totalCount = this.videoDAO.countForViewer(filters, profileContext.activeProfileId);
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
