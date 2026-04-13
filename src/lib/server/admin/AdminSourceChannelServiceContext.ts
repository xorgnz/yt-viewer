import type Database from 'better-sqlite3';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { AdminSourceChannelLookupService } from '$lib/server/admin/AdminSourceChannelLookupService';
import { AdminSourceChannelPageService } from '$lib/server/admin/AdminSourceChannelPageService';
import { AdminSourceChannelYouTubeCoordinator } from '$lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '$lib/server/admin/AdminYouTubeClientProvider';

export class AdminSourceChannelServiceContext
{
    static createPageService(db: Database.Database): AdminSourceChannelPageService
    {
        return new AdminSourceChannelPageService(
            db,
            new SourceChannelDAO(db),
            new AdminYouTubeClientProvider(),
            new AdminSourceChannelYouTubeCoordinator()
        );
    }

    static createLookupService(): AdminSourceChannelLookupService
    {
        return new AdminSourceChannelLookupService(
            new AdminYouTubeClientProvider(),
            new AdminSourceChannelYouTubeCoordinator()
        );
    }
}
