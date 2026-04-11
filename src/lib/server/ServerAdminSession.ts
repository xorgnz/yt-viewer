import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { clearAdminSession, hasAdminSession, setAdminSession, verifyAdminPassword } from '$lib/auth/admin';

export class ServerAdminSession
{
    readonly isLoggedIn: boolean;

    private constructor(isLoggedIn: boolean)
    {
        this.isLoggedIn = isLoggedIn;
    }

    static resolve(cookies: Pick<Cookies, 'get'>): ServerAdminSession
    {
        return new ServerAdminSession(hasAdminSession(cookies));
    }

    static authenticate(cookies: Pick<Cookies, 'set'>, password: string): boolean
    {
        if (!verifyAdminPassword(password)) {
            return false;
        }

        setAdminSession(cookies);
        return true;
    }

    static clear(cookies: Pick<Cookies, 'delete'>): void
    {
        clearAdminSession(cookies);
    }

    requireRouteAccess(pathname: string): void
    {
        if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !this.isLoggedIn) {
            throw redirect(302, '/admin/login');
        }
    }
}
