import { hasAdminSession } from '$lib/auth/admin';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, url }: any) =>
{
    // Allow unauthenticated access only to /admin/login
    if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
        if (!hasAdminSession(cookies)) {
            throw redirect(302, '/admin/login');
        }
    }
    return {};
};
