import type { Cookies } from '@sveltejs/kit';
import { ProfileDAO } from '$lib/daos/profileDAO';
import type { Profile } from '$lib/entities/profile';
import { DEFAULT_PROFILE_KEY, ensureProfiles, getActiveProfileKey, type ProfileKey } from '$lib/profiles';

export class ServerProfileContext
{
    readonly activeProfile: Profile;
    readonly requestedProfileKey: ProfileKey;

    private constructor(activeProfile: Profile, requestedProfileKey: ProfileKey)
    {
        this.activeProfile = activeProfile;
        this.requestedProfileKey = requestedProfileKey;
    }

    static resolve(profileDAO: ProfileDAO, cookies: Pick<Cookies, 'get'>): ServerProfileContext
    {
        ensureProfiles(profileDAO);

        const requestedProfileKey = getActiveProfileKey(cookies);
        const activeProfile = profileDAO.getByKey(requestedProfileKey) || profileDAO.getByKey(DEFAULT_PROFILE_KEY);

        if (!activeProfile) {
            throw new Error('Failed to resolve a supported active profile.');
        }

        return new ServerProfileContext(activeProfile, requestedProfileKey);
    }

    get activeProfileId(): number
    {
        return this.activeProfile.id;
    }

    get activeProfileKey(): ProfileKey
    {
        return this.activeProfile.key as ProfileKey;
    }

    get activeProfileName(): string
    {
        return this.activeProfile.name;
    }
}
