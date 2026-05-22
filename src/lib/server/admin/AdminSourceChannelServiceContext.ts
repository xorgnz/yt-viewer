import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { AdminSourceChannelLookupService } from '$lib/server/admin/AdminSourceChannelLookupService';
import { AdminSourceChannelPageService } from '$lib/server/admin/AdminSourceChannelPageService';

export class AdminSourceChannelServiceContext
{
    readonly pageService: AdminSourceChannelPageService;
    readonly lookupService: AdminSourceChannelLookupService;

    private constructor(
        pageService: AdminSourceChannelPageService,
        lookupService: AdminSourceChannelLookupService
    )
    {
        this.pageService = pageService;
        this.lookupService = lookupService;
    }

    static resolve(db: DatabasePool): AdminSourceChannelServiceContext
    {
        return new AdminSourceChannelServiceContext(
            new AdminSourceChannelPageService(
                db,
                new SourceChannelDAO(db)
            ),
            new AdminSourceChannelLookupService()
        );
    }

    static resolveLookupService(): AdminSourceChannelLookupService
    {
        return new AdminSourceChannelLookupService();
    }
}
// apply-patch-anchor - do not delete
