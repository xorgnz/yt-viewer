import { getDb } from '$lib/daos/_shared';
import type { ChannelGroupAssignment } from '$lib/entities/channelGroupAssignment';

export const AssignmentDAO = {
    add(channel_id: number, group_id: number)
    {
        const db = getDb();
        db.prepare('INSERT OR IGNORE INTO channel_group_assignments(channel_id, group_id) VALUES(?,?)').run(channel_id, group_id);
    },
    remove(channel_id: number, group_id: number)
    {
        const db = getDb();
        db.prepare('DELETE FROM channel_group_assignments WHERE channel_id = ? AND group_id = ?').run(channel_id, group_id);
    },
    listForChannel(channel_id: number): ChannelGroupAssignment[]
    {
        const db = getDb();
        return db
            .prepare('SELECT * FROM channel_group_assignments WHERE channel_id = ?')
            .all(channel_id) as ChannelGroupAssignment[];
    }
};
