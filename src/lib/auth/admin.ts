// Simple hard-coded admin auth utilities
// Note: For development/demo purposes only. Do not use in production as-is.

export const ADMIN_COOKIE = 'ytcw_admin';

// Hard-coded password with optional env override
const DEFAULT_PASSWORD = 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

export function verifyAdminPassword(password: string): boolean
{
    return String(password) === String(ADMIN_PASSWORD);
}

// Minimal cookie-based session helpers
export function setAdminSession(cookies: any): void
{
    cookies.set(ADMIN_COOKIE, '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        // Non-secure in dev; consider secure: true behind HTTPS
        secure: false,
        maxAge: 60 * 60 * 8 // 8 hours
    });
}

export function clearAdminSession(cookies: any): void
{
    cookies.delete(ADMIN_COOKIE, { path: '/' });
}

export function hasAdminSession(cookies: any): boolean
{
    return cookies.get(ADMIN_COOKIE) === '1';
}
