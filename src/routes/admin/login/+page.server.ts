import { fail, redirect } from '@sveltejs/kit';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const actions = {
    default: async ({ request, cookies }: any) =>
    {
        const form = await request.formData();
        const password = String(form.get('password') || '');
        if (!ServerAdminSession.authenticate(cookies, password)) {
            return fail(400, { error: 'Invalid password' });
        }
        throw redirect(302, '/admin');
    }
};

export const load = async () =>
{
    // No special data; avoid flashing error unless provided by action
    return {};
};
