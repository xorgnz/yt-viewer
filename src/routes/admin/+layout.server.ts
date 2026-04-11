import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const load = async ({ cookies, url }: any) =>
{
    const adminSession = ServerAdminSession.resolve(cookies);
    adminSession.requireRouteAccess(url.pathname);

    return {};
};
