import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { ProfileSwitchPasswordPolicy } from '$lib/auth/ProfileSwitchPasswordPolicy';
import {
    ProfileCatalog,
    ProfileReturnPathPolicy,
    ProfileSelectionCookieStore
} from '$lib/profiles';

export const POST: RequestHandler = async ({ request, cookies }) =>
{
    const form = await request.formData();
    const profile = String(form.get('profile') || '').trim();
    const password = String(form.get('password') || '');
    const returnTo = ProfileReturnPathPolicy.sanitize(String(form.get('returnTo') || '').trim());

    if (!ProfileCatalog.isProfileKey(profile)) {
        return json({ message: 'Invalid profile selection.' }, { status: 400 });
    }

    const cookieStore = new ProfileSelectionCookieStore(cookies);
    const currentProfileKey = cookieStore.getActiveProfileKey();

    if (ProfileCatalog.requiresAdultPassword(currentProfileKey, profile) && !ProfileSwitchPasswordPolicy.verify(password)) {
        throw redirect(303, ProfileReturnPathPolicy.withError(returnTo, 'adult-password'));
    }

    cookieStore.setActiveProfileKey(profile);

    throw redirect(303, returnTo);
};
// apply-patch-anchor - do not delete
