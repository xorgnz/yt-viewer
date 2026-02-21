import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () =>
{
    // Home page now redirects to the Virtual Channels selection page
    throw redirect(302, '/viewer/virtual-channels');
};
