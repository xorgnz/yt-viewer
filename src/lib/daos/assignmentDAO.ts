import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type { VirtualChannelAssignment, VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';

export class AssignmentDAO extends SqliteDAO
{
    add(source_channel_id: number, virtual_channel_id: number, mode: VirtualChannelAssignmentMode = 'all')
    {
        this.db.prepare(`
            INSERT INTO virtual_channel_assignments(source_channel_id, virtual_channel_id, mode)
            VALUES(?,?,?)
            ON CONFLICT(source_channel_id, virtual_channel_id) DO UPDATE SET
                mode=excluded.mode,
                updated_at=(strftime('%s','now')*1000)
        `).run(source_channel_id, virtual_channel_id, mode);
    }

    remove(source_channel_id: number, virtual_channel_id: number)
    {
        this.db.prepare(`DELETE FROM virtual_channel_assignments WHERE source_channel_id = ? AND virtual_channel_id = ?`).run(source_channel_id, virtual_channel_id);
    }

    updateMode(id: number, mode: VirtualChannelAssignmentMode)
    {
        this.db.prepare(`
            UPDATE virtual_channel_assignments
            SET mode = ?, updated_at = (strftime('%s','now')*1000)
            WHERE id = ?
        `).run(mode, id);
    }

    get(id: number): VirtualChannelAssignment | undefined
    {
        return this.db
            .prepare(`SELECT * FROM virtual_channel_assignments WHERE id = ?`)
            .get(id) as VirtualChannelAssignment | undefined;
    }

    listForSourceChannel(source_channel_id: number): VirtualChannelAssignment[]
    {
        return this.db
            .prepare(`SELECT * FROM virtual_channel_assignments WHERE source_channel_id = ? ORDER BY virtual_channel_id, id`)
            .all(source_channel_id) as VirtualChannelAssignment[];
    }

    listForChannel(source_channel_id: number): VirtualChannelAssignment[]
    {
        return this.listForSourceChannel(source_channel_id);
    }

    listForVirtualChannel(virtual_channel_id: number): VirtualChannelAssignment[]
    {
        return this.db
            .prepare(`SELECT * FROM virtual_channel_assignments WHERE virtual_channel_id = ? ORDER BY source_channel_id, id`)
            .all(virtual_channel_id) as VirtualChannelAssignment[];
    }
}
