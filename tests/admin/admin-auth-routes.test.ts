import { describe, expect, it } from 'vitest';
import { ADMIN_PASSWORD } from '../../src/lib/auth/admin';

type AdminLoginRouteModule = typeof import('../../src/routes/admin/login/+page.server');
type AdminLogoutRouteModule = typeof import('../../src/routes/admin/logout/+server');

describe('admin auth routes', () => {
    it('sets the admin session cookie and redirects after a valid login', async () => {
        const routeModule: AdminLoginRouteModule = await import('../../src/routes/admin/login/+page.server');
        const cookieCalls: Array<{ name: string; value: string; options: Record<string, any> }> = [];
        const form = new FormData();
        form.set('password', ADMIN_PASSWORD);

        await expect(routeModule.actions.default({
            request: new Request('http://localhost/admin/login', {
                method: 'POST',
                body: form
            }),
            cookies: {
                set(name: string, value: string, options: Record<string, any>) {
                    cookieCalls.push({ name, value, options });
                }
            }
        } as any)).rejects.toMatchObject({
            status: 302,
            location: '/admin'
        });

        expect(cookieCalls).toEqual([
            {
                name: 'ytcw_admin',
                value: '1',
                options: expect.objectContaining({
                    path: '/',
                    sameSite: 'lax',
                    httpOnly: true
                })
            }
        ]);
    });

    it('rejects invalid admin passwords without setting a session', async () => {
        const routeModule: AdminLoginRouteModule = await import('../../src/routes/admin/login/+page.server');
        const form = new FormData();
        form.set('password', 'wrong');

        const result = await routeModule.actions.default({
            request: new Request('http://localhost/admin/login', {
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
        expect(result?.data).toEqual({ error: 'Invalid password' });
    });

    it('clears the admin session cookie and redirects home on logout', async () => {
        const routeModule: AdminLogoutRouteModule = await import('../../src/routes/admin/logout/+server');
        const deleteCalls: Array<{ name: string; options: Record<string, any> }> = [];

        await expect(routeModule.POST({
            cookies: {
                delete(name: string, options: Record<string, any>) {
                    deleteCalls.push({ name, options });
                }
            }
        } as any)).rejects.toMatchObject({
            status: 302,
            location: '/'
        });

        expect(deleteCalls).toEqual([
            {
                name: 'ytcw_admin',
                options: {
                    path: '/'
                }
            }
        ]);
    });
});
