import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';

export const actions: Actions = {
    default: async ({ request, cookies }) =>
    {
        const form = await ServerActionForm.fromRequest(request);
        const password = form.getString('password');
        if (!ServerAdminSession.authenticate(cookies, password)) {
            return fail(400, { error: 'Invalid password' });
        }
        throw redirect(302, '/admin');
    }
} satisfies Actions;

export const load: PageServerLoad = async () =>
{
    // No special data; avoid flashing error unless provided by action
    return {};
};
// apply-patch-anchor - do not delete