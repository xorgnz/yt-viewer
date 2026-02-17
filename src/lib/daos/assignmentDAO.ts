import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { ChannelGroupAssignment } from '$lib/entities/channelGroupAssignment';

export class AssignmentDAO extends SqliteDAO
{
    add(channel_id: number, group_id: number)
    {
        this.db.prepare(`INSERT OR IGNORE INTO channel_group_assignments(channel_id, group_id) VALUES(?,?)`).run(channel_id, group_id);
    }

    remove(channel_id: number, group_id: number)
    {
        this.db.prepare(`DELETE FROM channel_group_assignments WHERE channel_id = ? AND group_id = ?`).run(channel_id, group_id);
    }

    listForChannel(channel_id: number): ChannelGroupAssignment[]
    {
        return this.db
            .prepare(`SELECT * FROM channel_group_assignments WHERE channel_id = ?`)
            .all(channel_id) as ChannelGroupAssignment[];
    }
}
