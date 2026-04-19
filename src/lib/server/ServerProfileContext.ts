import type { Cookies } from '@sveltejs/kit';
import type { ProfileDAO, PostgresProfileDAO } from '$lib/daos/profileDAO';
import type { Profile } from '$lib/entities/profile';
import {
    ProfileCatalog,
    ProfileSelectionCookieStore,
    type ProfileKey
} from '$lib/profiles';

type ServerProfileDAO = Pick<ProfileDAO | PostgresProfileDAO, 'getByKey' | 'list' | 'upsertByKey'>;

export class ServerProfileContext
{
    readonly activeProfile: Profile;
    readonly requestedProfileKey: ProfileKey;

    private constructor(activeProfile: Profile, requestedProfileKey: ProfileKey)
    {
        this.activeProfile = activeProfile;
        this.requestedProfileKey = requestedProfileKey;
    }

    static resolve(profileDAO: ProfileDAO, cookies: Pick<Cookies, 'get'>): ServerProfileContext;
    static resolve(profileDAO: PostgresProfileDAO, cookies: Pick<Cookies, 'get'>): Promise<ServerProfileContext>;
    static resolve(
        profileDAO: ServerProfileDAO,
        cookies: Pick<Cookies, 'get'>
    ): ServerProfileContext | Promise<ServerProfileContext>
    {
        const ensureResult = (ProfileCatalog.ensureProfiles as (dao: ServerProfileDAO) => void | Promise<void>)(profileDAO);

        const requestedProfileKey = new ProfileSelectionCookieStore(cookies).getActiveProfileKey();

        const buildContext = (activeProfile: Profile | undefined): ServerProfileContext => {
            if (!activeProfile) {
                throw new Error('Failed to resolve a supported active profile.');
            }

            return new ServerProfileContext(activeProfile, requestedProfileKey);
        };

        if (ensureResult instanceof Promise) {
            return ensureResult.then(async () => {
                const activeProfile = await profileDAO.getByKey(requestedProfileKey)
                    || await profileDAO.getByKey(ProfileCatalog.DEFAULT_KEY);

                return buildContext(activeProfile);
            });
        }

        const syncProfileDAO = profileDAO as ProfileDAO;
        const activeProfile = syncProfileDAO.getByKey(requestedProfileKey)
            || syncProfileDAO.getByKey(ProfileCatalog.DEFAULT_KEY);

        return buildContext(activeProfile);
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
// apply-patch-anchor - do not delete