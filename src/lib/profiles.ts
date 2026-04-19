import type { Cookies } from '@sveltejs/kit';
import type { ProfileDAO, PostgresProfileDAO } from '$lib/daos/profileDAO';

const PROFILE_DEFINITIONS = [
    { key: 'default', name: 'Adult' },
    { key: 'child', name: 'Child' }
] as const;

export type ProfileKey = (typeof PROFILE_DEFINITIONS)[number]['key'];
type MaybePromise<T> = T | Promise<T>;
type ProfileCatalogDAO = Pick<ProfileDAO | PostgresProfileDAO, 'upsertByKey'>;

type ProfileSelectionCookies = Partial<Pick<Cookies, 'get' | 'set'>>;

export class ProfileCatalog
{
    static readonly DEFAULT_KEY: ProfileKey = 'default';

    static isProfileKey(value: string | null | undefined): value is ProfileKey
    {
        return PROFILE_DEFINITIONS.some((profile) => profile.key === value);
    }

    static ensureProfiles(profileDAO: ProfileDAO): void;
    static ensureProfiles(profileDAO: PostgresProfileDAO): Promise<void>;
    static ensureProfiles(profileDAO: ProfileCatalogDAO): MaybePromise<void>
    {
        let chain: Promise<void> | null = null;

        for (const profile of PROFILE_DEFINITIONS) {
            const result = profileDAO.upsertByKey(profile.key, profile.name);

            if (chain) {
                chain = chain.then(() => result);
            } else if (result instanceof Promise) {
                chain = result;
            }
        }

        return chain ?? undefined;
    }
}

export class ProfileSelectionCookieStore
{
    static readonly COOKIE_NAME = 'ytcw_active_profile';

    private readonly cookies: ProfileSelectionCookies;

    constructor(cookies: ProfileSelectionCookies)
    {
        this.cookies = cookies;
    }

    getActiveProfileKey(): ProfileKey
    {
        const cookieValue = this.cookies.get?.(ProfileSelectionCookieStore.COOKIE_NAME);
        if (ProfileCatalog.isProfileKey(cookieValue)) {
            return cookieValue;
        }

        return ProfileCatalog.DEFAULT_KEY;
    }

    setActiveProfileKey(profileKey: ProfileKey): void
    {
        if (!this.cookies.set) {
            throw new Error('Profile selection cookie writer is not available.');
        }

        this.cookies.set(ProfileSelectionCookieStore.COOKIE_NAME, profileKey, {
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 365
        });
    }
}

export class ProfileReturnPathPolicy
{
    static sanitize(value: string | null | undefined): string
    {
        if (!value || !value.startsWith('/') || value.startsWith('//')) {
            return '/viewer';
        }

        return value;
    }
}
// apply-patch-anchor - do not delete
