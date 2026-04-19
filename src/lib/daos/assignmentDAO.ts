import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
import type { VirtualChannelAssignment, VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';

export class MySqlAssignmentDAO extends MySqlDAO
{
    async add(
        source_channel_id: number,
        virtual_channel_id: number,
        mode: VirtualChannelAssignmentMode = 'all'
    ): Promise<void>
    {
        await this.run(`
            INSERT INTO virtual_channel_assignments(source_channel_id, virtual_channel_id, mode)
            VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE
                mode=VALUES(mode),
                updated_at=(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
        `, [source_channel_id, virtual_channel_id, mode]);
    }

    async remove(source_channel_id: number, virtual_channel_id: number): Promise<void>
    {
        await this.run(`DELETE FROM virtual_channel_assignments WHERE source_channel_id = ? AND virtual_channel_id = ?`, [source_channel_id, virtual_channel_id]);
    }

    async updateMode(id: number, mode: VirtualChannelAssignmentMode): Promise<void>
    {
        await this.run(`
            UPDATE virtual_channel_assignments
            SET mode = ?, updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
            WHERE id = ?
        `, [mode, id]);
    }

    async get(id: number): Promise<VirtualChannelAssignment | undefined>
    {
        return this.getOne<VirtualChannelAssignment>(`SELECT * FROM virtual_channel_assignments WHERE id = ?`, [id]);
    }

    async listForSourceChannel(source_channel_id: number): Promise<VirtualChannelAssignment[]>
    {
        return this.listRows<VirtualChannelAssignment>(
            `SELECT * FROM virtual_channel_assignments WHERE source_channel_id = ? ORDER BY virtual_channel_id, id`,
            [source_channel_id]
        );
    }

    async listForChannel(source_channel_id: number): Promise<VirtualChannelAssignment[]>
    {
        return this.listForSourceChannel(source_channel_id);
    }

    async listForVirtualChannel(virtual_channel_id: number): Promise<VirtualChannelAssignment[]>
    {
        return this.listRows<VirtualChannelAssignment>(
            `SELECT * FROM virtual_channel_assignments WHERE virtual_channel_id = ? ORDER BY source_channel_id, id`,
            [virtual_channel_id]
        );
    }
}
// apply-patch-anchor - do not delete



