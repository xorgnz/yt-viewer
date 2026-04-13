import type Database from 'better-sqlite3';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { AdminSourceChannelLookupService } from '$lib/server/admin/AdminSourceChannelLookupService';
import { AdminSourceChannelPageService } from '$lib/server/admin/AdminSourceChannelPageService';
import { AdminSourceChannelYouTubeCoordinator } from '$lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '$lib/server/admin/AdminYouTubeClientProvider';

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

    static resolve(db: Database.Database): AdminSourceChannelServiceContext
    {
        const clientProvider = new AdminYouTubeClientProvider();
        const coordinator = new AdminSourceChannelYouTubeCoordinator();

        return new AdminSourceChannelServiceContext(
            new AdminSourceChannelPageService(
                db,
                new SourceChannelDAO(db),
                clientProvider,
                coordinator
            ),
            new AdminSourceChannelLookupService(
                clientProvider,
                coordinator
            )
        );
    }

    static resolveLookupService(): AdminSourceChannelLookupService
    {
        return new AdminSourceChannelLookupService(
            new AdminYouTubeClientProvider(),
            new AdminSourceChannelYouTubeCoordinator()
        );
    }
}
