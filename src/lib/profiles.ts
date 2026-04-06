import type { Cookies } from '@sveltejs/kit';
import { ProfileDAO } from '$lib/daos/profileDAO';

export const ACTIVE_PROFILE_COOKIE = 'ytcw_active_profile';
export const DEFAULT_PROFILE_KEY = 'default';
export const PROFILE_DEFINITIONS = [
    { key: 'default', name: 'Adult' },
    { key: 'child', name: 'Child' }
] as const;

export type ProfileKey = (typeof PROFILE_DEFINITIONS)[number]['key'];

export function isProfileKey(value: string | null | undefined): value is ProfileKey
{
    return PROFILE_DEFINITIONS.some((profile) => profile.key === value);
}

export function ensureProfiles(profileDAO: ProfileDAO)
{
    // Keep the site-wide profile list aligned with the hard-coded viewer identities.
    for (const profile of PROFILE_DEFINITIONS) {
        profileDAO.upsertByKey(profile.key, profile.name);
    }
}

export function getActiveProfileKey(cookies: Pick<Cookies, 'get'>): ProfileKey
{
    const cookieValue = cookies.get(ACTIVE_PROFILE_COOKIE);
    if (isProfileKey(cookieValue)) {
        return cookieValue;
    }

    return DEFAULT_PROFILE_KEY;
}

export function sanitizeReturnTo(value: string | null | undefined): string
{
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/viewer';
    }

    return value;
}
