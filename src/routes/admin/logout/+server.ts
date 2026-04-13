import type { RequestHandler } from './$types';
import { ServerAdminSession } from '$lib/server/ServerAdminSession';
import { redirect } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) =>
{
    ServerAdminSession.clear(cookies);
    throw redirect(302, '/');
};
