import { clearAdminSession } from '$lib/auth/admin';
import { redirect } from '@sveltejs/kit';

export const POST = async ({ cookies }: any) =>
{
    clearAdminSession(cookies);
    throw redirect(302, '/');
};
