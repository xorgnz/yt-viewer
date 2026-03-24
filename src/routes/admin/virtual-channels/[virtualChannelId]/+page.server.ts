import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ params }) =>
{
    // Validate the requested virtual channel id.
    const virtualChannelId = Number(params.virtualChannelId);

    if (!virtualChannelId) {
        throw error(404, 'Virtual channel not found');
    }

    const wrapper = new DatabaseWrapper(envToMode());
    const db = wrapper.open();

    try {
        // Load the virtual channel record first.
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const virtualChannel = virtualChannelDAO.get(virtualChannelId);

        if (!virtualChannel) {
            throw error(404, 'Virtual channel not found');
        }

        // Load imported source channels and existing assignments for the page shell.
        const assignmentDAO = new AssignmentDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const availableSourceChannels = sourceChannelDAO.list();
        const sourceChannelsById = new Map(availableSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = assignmentDAO.listForVirtualChannel(virtualChannelId);

        const associatedSourceChannels = assignments.map((assignment) => ({
            assignment,
            sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null
        }));

        return {
            virtualChannel,
            associatedSourceChannels,
            availableSourceChannels
        };
    } finally {
        wrapper.close();
    }
};
