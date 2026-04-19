import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import {
    ProfileCatalog,
    ProfileReturnPathPolicy,
    ProfileSelectionCookieStore
} from '$lib/profiles';

export const POST: RequestHandler = async ({ request, cookies }) =>
{
    const form = await request.formData();
    const profile = String(form.get('profile') || '').trim();
    const returnTo = ProfileReturnPathPolicy.sanitize(String(form.get('returnTo') || '').trim());

    if (!ProfileCatalog.isProfileKey(profile)) {
        return json({ message: 'Invalid profile selection.' }, { status: 400 });
    }

    new ProfileSelectionCookieStore(cookies).setActiveProfileKey(profile);

    throw redirect(303, returnTo);
};
// apply-patch-anchor - do not delete