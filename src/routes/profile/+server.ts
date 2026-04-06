import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { ACTIVE_PROFILE_COOKIE, isProfileKey, sanitizeReturnTo } from '$lib/profiles';

export const POST: RequestHandler = async ({ request, cookies }) =>
{
    const form = await request.formData();
    const profile = String(form.get('profile') || '').trim();
    const returnTo = sanitizeReturnTo(String(form.get('returnTo') || '').trim());

    if (!isProfileKey(profile)) {
        return json({ message: 'Invalid profile selection.' }, { status: 400 });
    }

    cookies.set(ACTIVE_PROFILE_COOKIE, profile, {
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365
    });

    throw redirect(303, returnTo);
};
