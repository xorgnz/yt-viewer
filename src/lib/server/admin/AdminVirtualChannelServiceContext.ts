import { PostgresAssignmentDAO } from '$lib/daos/assignmentDAO';
import { PostgresSourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { PostgresVideoDAO } from '$lib/daos/videoDAO';
import { PostgresVirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { PostgresVirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
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

    static resolve(db: PostgresPoolWrapper): AdminVirtualChannelServiceContext
    {
        const virtualChannelDAO = new PostgresVirtualChannelDAO(db);
        const assignmentDAO = new PostgresAssignmentDAO(db);
        const sourceChannelDAO = new PostgresSourceChannelDAO(db);
        const videoDAO = new PostgresVideoDAO(db);
        const selectionDAO = new PostgresVirtualChannelAssignmentVideoSelectionDAO(db);

        return new AdminVirtualChannelServiceContext(
            new AdminVirtualChannelIndexService(
                virtualChannelDAO as never,
                assignmentDAO as never,
                sourceChannelDAO as never
            ),
            new AdminVirtualChannelManageService(
                virtualChannelDAO as never,
                assignmentDAO as never,
                sourceChannelDAO as never,
                videoDAO as never,
                selectionDAO as never
            )
        );
    }
}
