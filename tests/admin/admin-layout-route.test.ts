import { describe, expect, it } from 'vitest';

type AdminLayoutRouteModule = typeof import('../../src/routes/admin/+layout.server');

describe('admin layout route', () => {
    function cookieJar(values: Record<string, string | undefined> = {})
    {
        return {
            get(name: string) {
                return values[name];
            }
        };
    }

    it('redirects unauthenticated admin requests to the login route', async () => {
        const routeModule: AdminLayoutRouteModule = await import('../../src/routes/admin/+layout.server');

        await expect(routeModule.load({
            cookies: cookieJar(),
            url: new URL('http://localhost/admin/source-channels')
        } as any)).rejects.toMatchObject({
            status: 302,
            location: '/admin/login'
        });
    });

    it('allows the admin login path without a session', async () => {
        const routeModule: AdminLayoutRouteModule = await import('../../src/routes/admin/+layout.server');

        const result = await routeModule.load({
            cookies: cookieJar(),
            url: new URL('http://localhost/admin/login')
        } as any);

        expect(result).toEqual({});
    });

    it('allows authenticated admin requests', async () => {
        const routeModule: AdminLayoutRouteModule = await import('../../src/routes/admin/+layout.server');

        const result = await routeModule.load({
            cookies: cookieJar({
                ytcw_admin: '1'
            }),
            url: new URL('http://localhost/admin/source-channels')
        } as any);

        expect(result).toEqual({});
    });
});
// apply-patch-anchor - do not delete