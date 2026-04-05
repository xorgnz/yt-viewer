import type { Actions, PageServerLoad } from './$types';
import { DatabaseWrapper, DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { redirect, fail } from '@sveltejs/kit';
import type { SourceChannel } from '$lib/entities/sourceChannel';
import type { VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';

type InlineAssociation = {
    assignment: VirtualChannelAssignment;
    sourceChannel: SourceChannel | null;
};

type VirtualChannelRow = {
    id: number;
    name: string;
    associatedSourceChannels: InlineAssociation[];
    availableSourceChannels: SourceChannel[];
};

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async () =>
{
    const wrapper = new DatabaseWrapper(envToMode());
    const db = wrapper.open();

    try {
        // Load the full imported source-channel set once for row-level assignment shaping.
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const assignmentDAO = new AssignmentDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const allSourceChannels = sourceChannelDAO.list();
        const sourceChannelsById = new Map(allSourceChannels.map((channel) => [channel.id, channel]));

        // Build each virtual-channel row with current associations and remaining inline add options.
        const groups: VirtualChannelRow[] = virtualChannelDAO.list().map((group) => {
            const assignments = assignmentDAO.listForVirtualChannel(group.id);
            const associatedSourceChannels = assignments.map((assignment) => ({
                assignment,
                sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null
            }));
            const associatedSourceChannelIds = new Set(assignments.map((assignment) => assignment.source_channel_id));
            const availableSourceChannels = allSourceChannels.filter((channel) => !associatedSourceChannelIds.has(channel.id));

            return {
                id: group.id,
                name: group.name,
                associatedSourceChannels,
                availableSourceChannels
            };
        });

        return {
            groups,
            availableSourceChannels: allSourceChannels
        };
    } finally {
        wrapper.close();
    }
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await request.formData();
        const name = String(form.get('name') || '').trim();
        if (!name) return fail(400, { message: 'Name is required' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.create(name);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to create group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    },

    rename: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        const name = String(form.get('name') || '').trim();
        if (!id || !name) return fail(400, { message: 'Invalid input' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.rename(id, name);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to rename group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'Invalid id' });

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();
        const dao = new VirtualChannelDAO(db);
        try {
            dao.remove(id);
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to delete group' });
        }
        throw redirect(303, '/admin/virtual-channels');
    }
};
