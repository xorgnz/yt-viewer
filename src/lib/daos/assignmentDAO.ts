import { DAO } from '$lib/daos/shared/DAO';
import { VirtualChannelAssignmentMode, type VirtualChannelAssignment} from '$lib/entities/virtualChannelAssignment';

function parseAssignmentId(assignmentId: string | number): { sourceChannelId: string; virtualChannelId: string }
{
    const value = String(assignmentId);
    const delimiterIndex = value.indexOf('::');

    if (delimiterIndex <= 0) {
        throw new Error(`Invalid assignment id "${value}".`);
    }

    return {
        sourceChannelId: value.slice(0, delimiterIndex),
        virtualChannelId: value.slice(delimiterIndex + 2)
    };
}

export class AssignmentDAO extends DAO
{
    async add(
        source_channel_id: string | number,
        virtual_channel_id: string | number,
        mode: VirtualChannelAssignmentMode = VirtualChannelAssignmentMode.All
    ): Promise<void>
    {
        await this.run(`
            INSERT INTO virtual_channel_assignments(src_channel_id, vchannel_id, mode)
            VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE
                mode=VALUES(mode),
                updated_at=(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
        `, [String(source_channel_id), String(virtual_channel_id), mode]);
    }

    async remove(source_channel_id: string | number, virtual_channel_id: string | number): Promise<void>
    {
        await this.run(`DELETE FROM virtual_channel_assignments WHERE src_channel_id = ? AND vchannel_id = ?`, [String(source_channel_id), String(virtual_channel_id)]);
    }

    async updateMode(id: string | number, mode: VirtualChannelAssignmentMode): Promise<void>
    {
        const assignment = parseAssignmentId(id);

        await this.run(`
            UPDATE virtual_channel_assignments
            SET mode = ?, updated_at = (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
            WHERE src_channel_id = ? AND vchannel_id = ?
        `, [mode, assignment.sourceChannelId, assignment.virtualChannelId]);
    }

    async get(id: string | number): Promise<VirtualChannelAssignment | undefined>
    {
        const assignment = parseAssignmentId(id);

        return this.getOne<VirtualChannelAssignment>(`
            SELECT
                CONCAT(src_channel_id, '::', vchannel_id) AS id,
                src_channel_id AS source_channel_id,
                vchannel_id AS virtual_channel_id,
                mode,
                created_at,
                updated_at
            FROM virtual_channel_assignments
            WHERE src_channel_id = ? AND vchannel_id = ?
        `, [assignment.sourceChannelId, assignment.virtualChannelId]);
    }

    async listForSourceChannel(source_channel_id: string | number): Promise<VirtualChannelAssignment[]>
    {
        return this.listRows<VirtualChannelAssignment>(
            `SELECT
                CONCAT(src_channel_id, '::', vchannel_id) AS id,
                src_channel_id AS source_channel_id,
                vchannel_id AS virtual_channel_id,
                mode,
                created_at,
                updated_at
            FROM virtual_channel_assignments
            WHERE src_channel_id = ? ORDER BY vchannel_id, src_channel_id`,
            [String(source_channel_id)]
        );
    }

    async listForChannel(source_channel_id: string | number): Promise<VirtualChannelAssignment[]>
    {
        return this.listForSourceChannel(source_channel_id);
    }

    async listForVirtualChannel(virtual_channel_id: string | number): Promise<VirtualChannelAssignment[]>
    {
        return this.listRows<VirtualChannelAssignment>(
            `SELECT
                CONCAT(src_channel_id, '::', vchannel_id) AS id,
                src_channel_id AS source_channel_id,
                vchannel_id AS virtual_channel_id,
                mode,
                created_at,
                updated_at
            FROM virtual_channel_assignments
            WHERE vchannel_id = ? ORDER BY src_channel_id, vchannel_id`,
            [String(virtual_channel_id)]
        );
    }
}
// apply-patch-anchor - do not delete



