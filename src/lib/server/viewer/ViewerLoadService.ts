import { PostgresProfileDAO } from '$lib/daos/profileDAO';
import type { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerPageLoader } from '$lib/server/viewer/ViewerPageLoader';
import { ViewerQueryParser } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerLoadService
{
    private readonly profileDAO: PostgresProfileDAO;
    private readonly pageLoader: ViewerPageLoader;

    constructor(db: PostgresPoolWrapper)
    {
        this.profileDAO = new PostgresProfileDAO(db);
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