import type { LayoutServerLoad } from './$types';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const load: LayoutServerLoad = async ({ cookies, url }) =>
{
    const adminSession = ServerAdminSession.resolve(cookies);
    adminSession.requireRouteAccess(url.pathname);

    return {};
};
