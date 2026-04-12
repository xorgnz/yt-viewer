import type { Actions, PageServerLoad } from './$types';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';

export const load: PageServerLoad = async () =>
{
    return ServerDatabaseContext.run(({ db }) => {
        const channelDAO = new SourceChannelDAO(db);
        const groupDAO = new VirtualChannelDAO(db);
        const assignDAO = new AssignmentDAO(db);

        const channels = channelDAO.list();
        const groups = groupDAO.list();

        // Normalize assignment rows into the shape the page expects.
        const assignments: { channel_id: number; group_id: number }[] = [];
        for (const ch of channels) {
            const rows = assignDAO.listForChannel(ch.id);
            for (const r of rows) assignments.push({ channel_id: r.source_channel_id, group_id: r.virtual_channel_id });
        }

        return { channels, groups, assignments };
    });
};

export const actions: Actions = {
    add: async ({ request }) => {
        const form = await request.formData();
        const channelId = Number(form.get('channel_id'));
        const groupId = Number(form.get('group_id'));
        if (!channelId || !groupId) {
            return { success: false, error: 'Missing channel_id or group_id' };
        }

        return ServerDatabaseContext.run(({ db }) => {
            const dao = new AssignmentDAO(db);
            dao.add(channelId, groupId);
            return { success: true };
        });
    },
    remove: async ({ request }) => {
        const form = await request.formData();
        const channelId = Number(form.get('channel_id'));
        const groupId = Number(form.get('group_id'));
        if (!channelId || !groupId) {
            return { success: false, error: 'Missing channel_id or group_id' };
        }

        return ServerDatabaseContext.run(({ db }) => {
            const dao = new AssignmentDAO(db);
            dao.remove(channelId, groupId);
            return { success: true };
        });
    }
};
