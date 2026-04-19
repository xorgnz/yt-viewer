import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { AdminPasswordPolicy } from '$lib/auth/AdminPasswordPolicy';

export class ServerAdminSession
{
    private static readonly COOKIE_NAME = 'ytcw_admin';

    static isLoggedIn(cookies: Cookies): boolean
    {
        return cookies.get(ServerAdminSession.COOKIE_NAME) === '1';
    }

    static authenticate(cookies: Cookies, password: string): boolean
    {
        if (!AdminPasswordPolicy.verify(password)) {
            return false;
        }

        cookies.set(ServerAdminSession.COOKIE_NAME, '1', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 8
        });
        return true;
    }

    static clear(cookies: Cookies): void
    {
        cookies.delete(ServerAdminSession.COOKIE_NAME, { path: '/' });
    }

    static requireRouteAccess(pathname: string, isLoggedIn: boolean): void
    {
        if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !isLoggedIn) {
            throw redirect(302, '/admin/login');
        }
    }
}
// apply-patch-anchor - do not delete