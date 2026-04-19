import type { LayoutServerLoad } from './$types';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const load: LayoutServerLoad = async ({ cookies, url }) =>
{
    ServerAdminSession.requireRouteAccess(url.pathname, ServerAdminSession.isLoggedIn(cookies));

    return {};
};
// apply-patch-anchor - do not delete