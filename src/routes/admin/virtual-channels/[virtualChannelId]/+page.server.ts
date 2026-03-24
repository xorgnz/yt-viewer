import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ params }) =>
{
    const virtualChannelId = Number(params.virtualChannelId);

    if (!virtualChannelId) {
        throw error(404, 'Virtual channel not found');
    }

    const wrapper = new DatabaseWrapper(envToMode());
    const db = wrapper.open();

    try {
        const dao = new VirtualChannelDAO(db);
        const virtualChannel = dao.get(virtualChannelId);

        if (!virtualChannel) {
            throw error(404, 'Virtual channel not found');
        }

        return {
            virtualChannel
        };
    } finally {
        wrapper.close();
    }
};
