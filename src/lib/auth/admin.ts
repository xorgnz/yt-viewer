import type { Cookies } from '@sveltejs/kit';

type AdminSessionCookies = Partial<Pick<Cookies, 'get' | 'set' | 'delete'>>;

export class AdminPasswordPolicy
{
    private static readonly DEFAULT_PASSWORD = 'admin';

    static get configuredPassword(): string
    {
        return process.env.ADMIN_PASSWORD || AdminPasswordPolicy.DEFAULT_PASSWORD;
    }

    static verify(password: string): boolean
    {
        return String(password) === String(AdminPasswordPolicy.configuredPassword);
    }
}

export class AdminSessionCookieStore
{
    static readonly COOKIE_NAME = 'ytcw_admin';

    private readonly cookies: AdminSessionCookies;

    constructor(cookies: AdminSessionCookies)
    {
        this.cookies = cookies;
    }

    hasSession(): boolean
    {
        return this.cookies.get?.(AdminSessionCookieStore.COOKIE_NAME) === '1';
    }

    setSession(): void
    {
        if (!this.cookies.set) {
            throw new Error('Admin session cookie writer is not available.');
        }

        this.cookies.set(AdminSessionCookieStore.COOKIE_NAME, '1', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 8
        });
    }

    clearSession(): void
    {
        if (!this.cookies.delete) {
            throw new Error('Admin session cookie deleter is not available.');
        }

        this.cookies.delete(AdminSessionCookieStore.COOKIE_NAME, { path: '/' });
    }
}
