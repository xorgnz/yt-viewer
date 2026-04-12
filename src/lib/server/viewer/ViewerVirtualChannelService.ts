import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';

export class ViewerVirtualChannelService
{
    private readonly virtualChannelDAO: VirtualChannelDAO;
    private readonly profileContext: ServerProfileContext;

    constructor(virtualChannelDAO: VirtualChannelDAO, profileContext: ServerProfileContext)
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.profileContext = profileContext;
    }

    loadNavigation()
    {
        return {
            groups: this.virtualChannelDAO.list(),
            profileKey: this.profileContext.activeProfileKey
        };
    }
}
