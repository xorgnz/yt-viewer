import { ProfileDAO } from '$lib/daos/profileDAO';
import type Database from 'better-sqlite3';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerPageLoader } from '$lib/server/viewer/ViewerPageLoader';
import { ViewerQueryParser } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerLoadService
{
    private readonly profileDAO: ProfileDAO;
    private readonly pageLoader: ViewerPageLoader;

    constructor(db: Database.Database)
    {
        this.profileDAO = new ProfileDAO(db);
        this.pageLoader = new ViewerPageLoader(db);
    }

    load(url: URL, cookies: any)
    {
        const profileContext = ServerProfileContext.resolve(this.profileDAO, cookies);
        const filters = ViewerQueryParser.parse(url, profileContext.activeProfileKey);

        return this.pageLoader.load(filters, profileContext);
    }
}
