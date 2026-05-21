import { fail } from '@sveltejs/kit';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerProfileContext } from '$lib/server/ServerProfileContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';

export const load = async ({ cookies }: { cookies: any }) =>
{
    return ServerDatabaseContext.run(async ({ db }) => {
        const profileDAO = new ProfileDAO(db);
        const profileContext = await ServerProfileContext.resolve(profileDAO, cookies);

        return {
            activeProfile: profileContext.activeProfile.toFields()
        };
    });
};

export const actions = {
    async saveSplitTimerMode({ request, cookies }: { request: Request; cookies: any })
    {
        const form = await ServerActionForm.fromRequest(request);
        const splitTimerModeEnabled = form.getTrimmedString('splitTimerModeEnabled') !== '0';

        return ServerDatabaseContext.run(async ({ db }) => {
            const profileDAO = new ProfileDAO(db);
            const profileContext = await ServerProfileContext.resolve(profileDAO, cookies);

            await profileDAO.updateSplitTimerModeEnabled(
                String(profileContext.activeProfileKey),
                splitTimerModeEnabled
            );

            const activeProfile = await profileDAO.getByKey(String(profileContext.activeProfileKey));
            if (!activeProfile) {
                return fail(404, { message: 'Active profile not found.' });
            }

            return {
                ok: true,
                activeProfile: activeProfile.toFields(),
                message: 'Settings updated.'
            };
        });
    }
};
// apply-patch-anchor - do not delete
