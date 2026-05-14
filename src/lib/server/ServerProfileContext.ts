import type { Cookies } from '@sveltejs/kit';
import type { ProfileDAO } from '$lib/daos/profileDAO';
import type { Profile } from '$lib/entities/profile';
import {
    ProfileCatalog,
    ProfileSelectionCookieStore,
    type ProfileKey
} from '$lib/profiles';

type ServerProfileDAO = Pick<ProfileDAO, 'getByKey' | 'list' | 'upsertByKey'>;

export class ServerProfileContext
{
    readonly activeProfile: Profile;
    readonly requestedProfileKey: ProfileKey;

    private constructor(activeProfile: Profile, requestedProfileKey: ProfileKey)
    {
        this.activeProfile = activeProfile;
        this.requestedProfileKey = requestedProfileKey;
    }

    static resolve(profileDAO: ProfileDAO, cookies: Pick<Cookies, 'get'>): Promise<ServerProfileContext>;
    static async resolve(
        profileDAO: ServerProfileDAO,
        cookies: Pick<Cookies, 'get'>
    ): Promise<ServerProfileContext>
    {
        await ProfileCatalog.ensureProfiles(profileDAO);

        const requestedProfileKey = new ProfileSelectionCookieStore(cookies).getActiveProfileKey();
        const activeProfile = await profileDAO.getByKey(requestedProfileKey)
            || await profileDAO.getByKey(ProfileCatalog.DEFAULT_KEY);

        if (!activeProfile) {
            throw new Error('Failed to resolve a supported active profile.');
        }

        return new ServerProfileContext(activeProfile, requestedProfileKey);
    }

    get activeProfileId(): string | number
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
// apply-patch-anchor - do not delete
