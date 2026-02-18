import { fail, redirect } from '@sveltejs/kit';
import { setAdminSession, verifyAdminPassword } from '$lib/auth/admin';

export const actions = {
    default: async ({ request, cookies }: any) =>
    {
        const form = await request.formData();
        const password = String(form.get('password') || '');
        if (!verifyAdminPassword(password)) {
            return fail(400, { error: 'Invalid password' });
        }
        setAdminSession(cookies);
        throw redirect(302, '/admin');
    }
};

export const load = async () =>
{
    // No special data; avoid flashing error unless provided by action
    return {};
};
