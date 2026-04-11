import { ServerAdminSession } from '$lib/server/ServerAdminSession';
import { redirect } from '@sveltejs/kit';

export const POST = async ({ cookies }: any) =>
{
    ServerAdminSession.clear(cookies);
    throw redirect(302, '/');
};
