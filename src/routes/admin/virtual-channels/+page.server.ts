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

function parsePositiveInteger(value: FormDataEntryValue | null): number | null
{
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function buildVirtualChannelRow(
    virtualChannel: { id: number; name: string },
    allSourceChannels: SourceChannel[],
    assignmentDAO: AssignmentDAO
): VirtualChannelRow
{
    // Shape the current assignments and remaining inline add options for one row.
    const sourceChannelsById = new Map(allSourceChannels.map((channel) => [channel.id, channel]));
    const assignments = assignmentDAO.listForVirtualChannel(virtualChannel.id);
    const associatedSourceChannels = assignments.map((assignment) => ({
        assignment,
        sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null
    }));
    const associatedSourceChannelIds = new Set(assignments.map((assignment) => assignment.source_channel_id));
    const availableSourceChannels = allSourceChannels.filter((channel) => !associatedSourceChannelIds.has(channel.id));

    return {
        id: virtualChannel.id,
        name: virtualChannel.name,
        associatedSourceChannels,
        availableSourceChannels
    };
}

function loadVirtualChannelRows(db: ReturnType<DatabaseWrapper['open']>)
{
    // Load the imported source-channel catalog once and reuse it for every row.
    const virtualChannelDAO = new VirtualChannelDAO(db);
    const assignmentDAO = new AssignmentDAO(db);
    const sourceChannelDAO = new SourceChannelDAO(db);
    const allSourceChannels = sourceChannelDAO.list();
    const groups = virtualChannelDAO
        .list()
        .map((group) => buildVirtualChannelRow(group, allSourceChannels, assignmentDAO));

    return {
        groups,
        allSourceChannels,
        virtualChannelDAO,
        assignmentDAO,
        sourceChannelDAO
    };
}

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
        const { groups, allSourceChannels } = loadVirtualChannelRows(db);

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
    },

    addAssociationInline: async ({ request }) => {
        const form = await request.formData();
        const virtualChannelId = parsePositiveInteger(form.get('virtual_channel_id'));
        const sourceChannelId = parsePositiveInteger(form.get('source_channel_id'));

        if (!virtualChannelId) {
            return fail(400, { message: 'A valid virtual channel is required.', virtualChannelId: null });
        }

        if (!sourceChannelId) {
            return fail(400, { message: 'A valid source channel is required.', virtualChannelId });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            // Validate the association pair before writing and return the refreshed row state.
            const { allSourceChannels, virtualChannelDAO, assignmentDAO, sourceChannelDAO } = loadVirtualChannelRows(db);
            const virtualChannel = virtualChannelDAO.get(virtualChannelId);

            if (!virtualChannel) {
                return fail(404, { message: 'Virtual channel not found.', virtualChannelId });
            }

            if (!sourceChannelDAO.get(sourceChannelId)) {
                return fail(404, { message: 'Source channel not found.', virtualChannelId });
            }

            assignmentDAO.add(sourceChannelId, virtualChannelId);

            return {
                group: buildVirtualChannelRow(virtualChannel, allSourceChannels, assignmentDAO),
                message: 'Source channel added.',
                virtualChannelId
            };
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to add source channel.', virtualChannelId });
        } finally {
            wrapper.close();
        }
    },

    removeAssociationInline: async ({ request }) => {
        const form = await request.formData();
        const virtualChannelId = parsePositiveInteger(form.get('virtual_channel_id'));
        const sourceChannelId = parsePositiveInteger(form.get('source_channel_id'));

        if (!virtualChannelId) {
            return fail(400, { message: 'A valid virtual channel is required.', virtualChannelId: null });
        }

        if (!sourceChannelId) {
            return fail(400, { message: 'A valid source channel is required.', virtualChannelId });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            // Remove only existing row-level assignments and send back the refreshed row state.
            const { allSourceChannels, virtualChannelDAO, assignmentDAO } = loadVirtualChannelRows(db);
            const virtualChannel = virtualChannelDAO.get(virtualChannelId);

            if (!virtualChannel) {
                return fail(404, { message: 'Virtual channel not found.', virtualChannelId });
            }

            const assignment = assignmentDAO
                .listForVirtualChannel(virtualChannelId)
                .find((candidate) => candidate.source_channel_id === sourceChannelId);

            if (!assignment) {
                return fail(404, { message: 'Assignment not found.', virtualChannelId });
            }

            assignmentDAO.remove(sourceChannelId, virtualChannelId);

            return {
                group: buildVirtualChannelRow(virtualChannel, allSourceChannels, assignmentDAO),
                message: 'Source channel removed.',
                virtualChannelId
            };
        } catch (e: any) {
            return fail(400, { message: e?.message || 'Failed to remove source channel.', virtualChannelId });
        } finally {
            wrapper.close();
        }
    }
};
