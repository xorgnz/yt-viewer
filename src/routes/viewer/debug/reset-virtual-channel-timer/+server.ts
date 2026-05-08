import { redirect } from '@sveltejs/kit';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ViewerServiceContext } from '$lib/server/viewer/ViewerServiceContext';

function sanitizeReturnTo(returnTo: string): string
{
    if (!returnTo.startsWith('/viewer')) {
        return '/viewer/virtual-channels';
    }

    return returnTo;
}

export const POST = async ({ request, cookies }: { request: Request; cookies: any }) =>
{
    const form = await ServerActionForm.fromRequest(request);
    const virtualChannelId = form.getPositiveInteger('virtualChannelId');
    const returnTo = sanitizeReturnTo(form.getTrimmedString('returnTo', '/viewer/virtual-channels'));

    if (!virtualChannelId) {
        throw redirect(303, returnTo);
    }

    await ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = await ViewerServiceContext.resolve(db, cookies);
        await serviceContext.virtualChannelService.resetVirtualChannelTimer(virtualChannelId);
    });

    throw redirect(303, returnTo);
};
