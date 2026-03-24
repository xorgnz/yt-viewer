import type { Actions, PageServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';

function getModeFromEnv(): DatabaseMode
{
    const env = (process.env.NODE_ENV || 'development').toLowerCase();
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async () =>
{
    const wrapper = new DatabaseWrapper(getModeFromEnv());
    const db = wrapper.open();
    try {
        const channelDAO = new SourceChannelDAO(db);
        const groupDAO = new VirtualChannelDAO(db);
        const assignDAO = new AssignmentDAO(db);

        const channels = channelDAO.list();
        const groups = groupDAO.list();

        // Normalize assignment rows into the shape the page expects.
        const assignments: { channel_id: number; group_id: number }[] = [];
        for (const ch of channels) {
            const rows = assignDAO.listForChannel(ch.id);
            for (const r of rows) {
                assignments.push({
                    channel_id: (r as any).source_channel_id,
                    group_id: (r as any).virtual_channel_id
                });
            }
        }

        return { channels, groups, assignments };
    } finally {
        wrapper.close();
    }
};

export const actions: Actions = {
    add: async ({ request }) => {
        const form = await request.formData();
        const channelId = Number(form.get('channel_id'));
        const groupId = Number(form.get('group_id'));
        if (!channelId || !groupId) {
            return { success: false, error: 'Missing channel_id or group_id' };
        }
        const wrapper = new DatabaseWrapper(getModeFromEnv());
        const db = wrapper.open();
        try {
            const dao = new AssignmentDAO(db);
            dao.add(channelId, groupId);
            return { success: true };
        } finally {
            wrapper.close();
        }
    },
    remove: async ({ request }) => {
        const form = await request.formData();
        const channelId = Number(form.get('channel_id'));
        const groupId = Number(form.get('group_id'));
        if (!channelId || !groupId) {
            return { success: false, error: 'Missing channel_id or group_id' };
        }
        const wrapper = new DatabaseWrapper(getModeFromEnv());
        const db = wrapper.open();
        try {
            const dao = new AssignmentDAO(db);
            dao.remove(channelId, groupId);
            return { success: true };
        } finally {
            wrapper.close();
        }
    }
};
