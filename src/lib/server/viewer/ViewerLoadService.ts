import { MySqlProfileDAO } from '$lib/daos/profileDAO';
import type { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ViewerPageLoader } from '$lib/server/viewer/ViewerPageLoader';
import { ViewerQueryParser } from '$lib/server/viewer/ViewerQueryParser';

export class ViewerLoadService
{
    private readonly profileDAO: MySqlProfileDAO;
    private readonly pageLoader: ViewerPageLoader;

    constructor(db: MySqlPoolWrapper)
    {
        this.profileDAO = new MySqlProfileDAO(db);
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