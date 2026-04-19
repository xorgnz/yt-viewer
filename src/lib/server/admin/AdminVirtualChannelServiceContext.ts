import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { VideoDAO } from '$lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
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

    static resolve(db: DatabasePool): AdminVirtualChannelServiceContext
    {
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const assignmentDAO = new AssignmentDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const videoDAO = new VideoDAO(db);
        const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);

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