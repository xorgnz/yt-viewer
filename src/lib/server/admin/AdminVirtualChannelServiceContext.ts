import { MySqlAssignmentDAO } from '$lib/daos/assignmentDAO';
import { MySqlSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { MySqlVideoDAO } from '$lib/daos/videoDAO';
import { MySqlVirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { MySqlVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AdminVirtualChannelIndexService } from '$lib/server/admin/AdminVirtualChannelIndexService';
import { AdminVirtualChannelManageService } from '$lib/server/admin/AdminVirtualChannelManageService';

export class AdminVirtualChannelServiceContext
{
    readonly indexService: AdminVirtualChannelIndexService;
    readonly manageService: AdminVirtualChannelManageService;

    private constructor(
        indexService: AdminVirtualChannelIndexService,
        manageService: AdminVirtualChannelManageService
    )
    {
        this.indexService = indexService;
        this.manageService = manageService;
    }

    static resolve(db: MySqlPoolWrapper): AdminVirtualChannelServiceContext
    {
        const virtualChannelDAO = new MySqlVirtualChannelDAO(db);
        const assignmentDAO = new MySqlAssignmentDAO(db);
        const sourceChannelDAO = new MySqlSourceChannelDAO(db);
        const videoDAO = new MySqlVideoDAO(db);
        const selectionDAO = new MySqlVirtualChannelAssignmentVideoSelectionDAO(db);

        return new AdminVirtualChannelServiceContext(
            new AdminVirtualChannelIndexService(
                virtualChannelDAO,
                assignmentDAO,
                sourceChannelDAO
            ),
            new AdminVirtualChannelManageService(
                virtualChannelDAO,
                assignmentDAO,
                sourceChannelDAO,
                videoDAO,
                selectionDAO
            )
        );
    }
}
// apply-patch-anchor - do not delete