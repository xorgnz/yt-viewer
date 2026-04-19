import type { MySqlVirtualChannelDAO, VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';

export class ViewerVirtualChannelService
{
    private readonly virtualChannelDAO: Pick<VirtualChannelDAO | MySqlVirtualChannelDAO, 'list'>;
    private readonly profileContext: ServerProfileContext;

    constructor(
        virtualChannelDAO: Pick<VirtualChannelDAO | MySqlVirtualChannelDAO, 'list'>,
        profileContext: ServerProfileContext
    )
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.profileContext = profileContext;
    }

    async loadNavigation()
    {
        return {
            groups: await this.virtualChannelDAO.list(),
            profileKey: this.profileContext.activeProfileKey
        };
    }
}
// apply-patch-anchor - do not delete