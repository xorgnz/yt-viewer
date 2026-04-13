import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { AdminPasswordPolicy, AdminSessionCookieStore } from '$lib/auth/admin';

export class ServerAdminSession
{
    readonly isLoggedIn: boolean;

    private constructor(isLoggedIn: boolean)
    {
        this.isLoggedIn = isLoggedIn;
    }

    static resolve(cookies: Pick<Cookies, 'get'>): ServerAdminSession
    {
        return new ServerAdminSession(new AdminSessionCookieStore(cookies).hasSession());
    }

    static authenticate(cookies: Pick<Cookies, 'set'>, password: string): boolean
    {
        if (!AdminPasswordPolicy.verify(password)) {
            return false;
        }

        new AdminSessionCookieStore(cookies).setSession();
        return true;
    }

    static clear(cookies: Pick<Cookies, 'delete'>): void
    {
        new AdminSessionCookieStore(cookies).clearSession();
    }

    requireRouteAccess(pathname: string): void
    {
        if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !this.isLoggedIn) {
            throw redirect(302, '/admin/login');
        }
    }
}
