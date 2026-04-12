import type Database from 'better-sqlite3';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { VideoDAO } from '$lib/daos/videoDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerFlagService } from '$lib/server/viewer/ViewerFlagService';

export class ViewerActionContext
{
    readonly flagService: ViewerFlagService;

    private constructor(flagService: ViewerFlagService)
    {
        this.flagService = flagService;
    }

    static resolve(db: Database.Database, cookies: any): ViewerActionContext
    {
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), cookies);
        const flagService = new ViewerFlagService(
            new VideoDAO(db),
            new FlagsDAO(db),
            profileContext.activeProfileId
        );

        return new ViewerActionContext(flagService);
    }
}
