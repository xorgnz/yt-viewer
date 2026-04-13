import { describe, expect, it } from 'vitest';
import { AdminPasswordPolicy } from '../../src/lib/auth/admin';
import { ServerAdminSession } from '../../src/lib/server/ServerAdminSession';

describe('ServerAdminSession', () => {
    it('resolves login state from cookies', () => {
        const loggedOutSession = ServerAdminSession.resolve({
            get: () => undefined
        } as any);
        const loggedInSession = ServerAdminSession.resolve({
            get: () => '1'
        } as any);

        expect(loggedOutSession.isLoggedIn).toBe(false);
        expect(loggedInSession.isLoggedIn).toBe(true);
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
        const loggedOutSession = ServerAdminSession.resolve({
            get: () => undefined
        } as any);

        expect(() => loggedOutSession.requireRouteAccess('/admin/login')).not.toThrow();
        expect(() => loggedOutSession.requireRouteAccess('/viewer')).not.toThrow();

        try {
            loggedOutSession.requireRouteAccess('/admin/source-channels');
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
