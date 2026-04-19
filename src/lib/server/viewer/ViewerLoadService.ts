import { ProfileDAO } from '$lib/daos/profileDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerPageLoader } from '$lib/server/viewer/ViewerPageLoader';
import { ViewerQueryParser } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerLoadService
{
    private readonly profileDAO: ProfileDAO;
    private readonly pageLoader: ViewerPageLoader;

    constructor(db: DatabasePool)
    {
        this.profileDAO = new ProfileDAO(db);
        this.pageLoader = new ViewerPageLoader(db);
    }

    async load(url: URL, cookies: any)
    {
        const profileContext = await ServerProfileContext.resolve(this.profileDAO, cookies);
        const filters = ViewerQueryParser.parse(url, profileContext.activeProfileKey);

        return this.pageLoader.load(filters, profileContext);
    }
}
// apply-patch-anchor - do not delete