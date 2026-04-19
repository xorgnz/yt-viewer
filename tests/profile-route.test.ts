import { describe, expect, it } from 'vitest';

type ProfileRouteModule = typeof import('../src/routes/profile/+server');

describe('profile switch route', () => {
    it('stores the selected profile in a site-wide cookie and redirects back', async () => {
        const routeModule: ProfileRouteModule = await import('../src/routes/profile/+server');
        const cookieCalls: Array<{ name: string; value: string; options: Record<string, any> }> = [];
        const form = new FormData();
        form.set('profile', 'child');
        form.set('returnTo', '/history?channelId=2');

        await expect(routeModule.POST({
            request: new Request('http://localhost/profile', {
                method: 'POST',
                body: form
            }),
            cookies: {
                set(name: string, value: string, options: Record<string, any>) {
                    cookieCalls.push({ name, value, options });
                }
            }
        } as any)).rejects.toMatchObject({
            status: 303,
            location: '/history?channelId=2'
        });

        expect(cookieCalls).toEqual([
            {
                name: 'ytcw_active_profile',
                value: 'child',
                options: expect.objectContaining({
                    path: '/',
                    sameSite: 'lax',
                    httpOnly: true
                })
            }
        ]);
    });

    it('rejects invalid profile values', async () => {
        const routeModule: ProfileRouteModule = await import('../src/routes/profile/+server');
        const form = new FormData();
        form.set('profile', 'adult');
        form.set('returnTo', '/viewer');

        const result = await routeModule.POST({
            request: new Request('http://localhost/profile', {
                method: 'POST',
                body: form
            }),
            cookies: {
                set() {
                    throw new Error('should not be called');
                }
            }
        } as any);

        expect(result?.status).toBe(400);
    });
});
// apply-patch-anchor - do not delete