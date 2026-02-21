import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';

export class AssignmentDAO extends SqliteDAO
{
    add(channel_id: number, group_id: number)
    {
        this.db.prepare(`INSERT OR IGNORE INTO virtual_channel_assignments(channel_id, group_id) VALUES(?,?)`).run(channel_id, group_id);
    }

    remove(channel_id: number, group_id: number)
    {
        this.db.prepare(`DELETE FROM virtual_channel_assignments WHERE channel_id = ? AND group_id = ?`).run(channel_id, group_id);
    }

    listForChannel(channel_id: number): VirtualChannelAssignment[]
    {
        return this.db
            .prepare(`SELECT * FROM virtual_channel_assignments WHERE channel_id = ?`)
            .all(channel_id) as VirtualChannelAssignment[];
    }
}
