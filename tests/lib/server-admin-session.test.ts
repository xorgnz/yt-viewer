import { describe, expect, it } from 'vitest';
import { AdminPasswordPolicy } from '../../src/lib/auth/AdminPasswordPolicy';
import { ServerAdminSession } from '../../src/lib/server/ServerAdminSession';

describe('ServerAdminSession', () => {
    it('resolves login state from cookies', () => {
        const loggedOut = ServerAdminSession.isLoggedIn({
            get: () => undefined
        } as any);
        const loggedIn = ServerAdminSession.isLoggedIn({
            get: () => '1'
        } as any);

        expect(loggedOut).toBe(false);
        expect(loggedIn).toBe(true);
    });

    it('rejects invalid passwords and sets the admin session on success', () => {
        const cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
        const cookies = {
            set(name: string, value: string, options: Record<string, unknown>) {
                cookieCalls.push({ name, value, options });
            }
        };

        expect(ServerAdminSession.authenticate(cookies as any, 'wrong')).toBe(false);
        expect(ServerAdminSession.authenticate(cookies as any, AdminPasswordPolicy.configuredPassword)).toBe(true);
        expect(cookieCalls).toEqual([
            {
                name: 'ytcw_admin',
                value: '1',
                options: expect.objectContaining({
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax'
                })
            }
        ]);
    });

    it('redirects unauthenticated admin requests and allows login and non-admin paths', () => {
        const isLoggedIn = ServerAdminSession.isLoggedIn({
            get: () => undefined
        } as any);

        expect(() => ServerAdminSession.requireRouteAccess('/admin/login', isLoggedIn)).not.toThrow();
        expect(() => ServerAdminSession.requireRouteAccess('/viewer', isLoggedIn)).not.toThrow();

        try {
            ServerAdminSession.requireRouteAccess('/admin/source-channels', isLoggedIn);
            throw new Error('expected redirect');
        } catch (error: any) {
            expect(error.status).toBe(302);
            expect(error.location).toBe('/admin/login');
        }
    });

    it('clears the admin session cookie', () => {
        const cookieCalls: Array<{ name: string; options: Record<string, unknown> }> = [];
        const cookies = {
            delete(name: string, options: Record<string, unknown>) {
                cookieCalls.push({ name, options });
            }
        };

        ServerAdminSession.clear(cookies as any);

        expect(cookieCalls).toEqual([
            {
                name: 'ytcw_admin',
                options: { path: '/' }
            }
        ]);
    });
});
// apply-patch-anchor - do not delete