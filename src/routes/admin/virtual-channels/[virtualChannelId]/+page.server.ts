import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';

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

function parseVirtualChannelId(value: string): number | null
{
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAssignmentMode(value: FormDataEntryValue | null): VirtualChannelAssignmentMode
{
    return value === 'long_only' || value === 'selected_only' ? value : 'all';
}

export const actions: Actions = {
    addAssociation: async ({ params, request }) => {
        // Validate the route and submitted source channel reference.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const sourceChannelId = Number(form.get('source_channel_id'));
        const mode = parseAssignmentMode(form.get('mode'));

        if (!Number.isInteger(sourceChannelId) || sourceChannelId <= 0) {
            return fail(400, { message: 'A valid source channel is required.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            // Ensure both sides of the association exist before inserting it.
            const virtualChannelDAO = new VirtualChannelDAO(db);
            const sourceChannelDAO = new SourceChannelDAO(db);
            const assignmentDAO = new AssignmentDAO(db);

            if (!virtualChannelDAO.get(virtualChannelId)) {
                throw error(404, 'Virtual channel not found');
            }

            if (!sourceChannelDAO.get(sourceChannelId)) {
                return fail(404, { message: 'Source channel not found.' });
            }

            assignmentDAO.add(sourceChannelId, virtualChannelId, mode);
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}`);
    }
};
