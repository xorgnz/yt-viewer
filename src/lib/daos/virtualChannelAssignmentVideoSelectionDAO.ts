import { DAO } from '$lib/daos/shared/DAO';
import type {
    VirtualChannelAssignmentVideoReviewState,
    VirtualChannelAssignmentVideoSelection
} from '$lib/entities/virtualChannelAssignmentVideoSelection';

export class VirtualChannelAssignmentVideoSelectionDAO extends DAO
{
    async setReviewState(
        assignment_id: string | number,
        video_id: string | number,
        review_state: VirtualChannelAssignmentVideoReviewState
    ): Promise<void>
    {
        const [srcChannelId, vchannelId] = String(assignment_id).split('::');

        await this.run(`
            INSERT INTO virtual_channel_assignment_video_selections(
                src_channel_id,
                vchannel_id,
                video_id,
                review_state
            )
            VALUES(?,?,?,?)
            ON DUPLICATE KEY UPDATE
                review_state=VALUES(review_state),
                updated_at=(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
        `, [srcChannelId, vchannelId, String(video_id), review_state]);
    }

    async remove(assignment_id: string | number, video_id: string | number): Promise<void>
    {
        const [srcChannelId, vchannelId] = String(assignment_id).split('::');

        await this.run(`
            DELETE FROM virtual_channel_assignment_video_selections
            WHERE src_channel_id = ? AND vchannel_id = ? AND video_id = ?
        `, [srcChannelId, vchannelId, String(video_id)]);
    }

    async get(
        assignment_id: string | number,
        video_id: string | number
    ): Promise<VirtualChannelAssignmentVideoSelection | undefined>
    {
        const [srcChannelId, vchannelId] = String(assignment_id).split('::');

        return this.getOne<VirtualChannelAssignmentVideoSelection>(`
            SELECT
                CONCAT(src_channel_id, '::', vchannel_id, '::', video_id) AS id,
                CONCAT(src_channel_id, '::', vchannel_id) AS assignment_id,
                video_id,
                review_state,
                created_at,
                updated_at
            FROM virtual_channel_assignment_video_selections
            WHERE src_channel_id = ? AND vchannel_id = ? AND video_id = ?
        `, [srcChannelId, vchannelId, String(video_id)]);
    }

    async listForAssignment(assignment_id: string | number): Promise<VirtualChannelAssignmentVideoSelection[]>
    {
        const [srcChannelId, vchannelId] = String(assignment_id).split('::');

        return this.listRows<VirtualChannelAssignmentVideoSelection>(`
            SELECT
                CONCAT(src_channel_id, '::', vchannel_id, '::', video_id) AS id,
                CONCAT(src_channel_id, '::', vchannel_id) AS assignment_id,
                video_id,
                review_state,
                created_at,
                updated_at
            FROM virtual_channel_assignment_video_selections
            WHERE src_channel_id = ? AND vchannel_id = ?
            ORDER BY updated_at DESC, video_id DESC
        `, [srcChannelId, vchannelId]);
    }
}
// apply-patch-anchor - do not delete



