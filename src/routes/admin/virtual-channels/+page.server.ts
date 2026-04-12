import type { Actions, PageServerLoad } from './$types';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { redirect, fail } from '@sveltejs/kit';
import type Database from 'better-sqlite3';
import type { SourceChannel } from '$lib/entities/sourceChannel';
import type { VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';

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

function loadVirtualChannelRows(db: Database.Database)
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

export const load: PageServerLoad = async () =>
{
    return ServerDatabaseContext.run(({ db }) => {
        const { groups, allSourceChannels } = loadVirtualChannelRows(db);

        return {
            groups,
            availableSourceChannels: allSourceChannels
        };
    });
};

export const actions: Actions = {
    create: async ({ request }) => {
        const form = await request.formData();
        const name = String(form.get('name') || '').trim();
        if (!name) return fail(400, { message: 'Name is required' });

        const result = await ServerDatabaseContext.run(({ db }) => {
            const dao = new VirtualChannelDAO(db);

            try {
                dao.create(name);
            } catch (e: any) {
                return fail(400, { message: e?.message || 'Failed to create group' });
            }

            return null;
        });

        if (result) {
            return result;
        }

        throw redirect(303, '/admin/virtual-channels');
    },

    rename: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        const name = String(form.get('name') || '').trim();
        if (!id || !name) return fail(400, { message: 'Invalid input' });

        const result = await ServerDatabaseContext.run(({ db }) => {
            const dao = new VirtualChannelDAO(db);

            try {
                dao.rename(id, name);
            } catch (e: any) {
                return fail(400, { message: e?.message || 'Failed to rename group' });
            }

            return null;
        });

        if (result) {
            return result;
        }

        throw redirect(303, '/admin/virtual-channels');
    },

    delete: async ({ request }) => {
        const form = await request.formData();
        const id = Number(form.get('id'));
        if (!id) return fail(400, { message: 'Invalid id' });

        const result = await ServerDatabaseContext.run(({ db }) => {
            const dao = new VirtualChannelDAO(db);

            try {
                dao.remove(id);
            } catch (e: any) {
                return fail(400, { message: e?.message || 'Failed to delete group' });
            }

            return null;
        });

        if (result) {
            return result;
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

        return ServerDatabaseContext.run(({ db }) => {
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
            }
        });
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

        return ServerDatabaseContext.run(({ db }) => {
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
            }
        });
    }
};
