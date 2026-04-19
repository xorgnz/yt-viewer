import { DAO } from '$lib/daos/shared/DAO';
import type {
    VirtualChannelAssignmentVideoReviewState,
    VirtualChannelAssignmentVideoSelection
} from '$lib/entities/virtualChannelAssignmentVideoSelection';

export class VirtualChannelAssignmentVideoSelectionDAO extends DAO
{
    async setReviewState(
        assignment_id: number,
        video_id: number,
        review_state: VirtualChannelAssignmentVideoReviewState
    ): Promise<void>
    {
        await this.run(`
            INSERT INTO virtual_channel_assignment_video_selections(
                assignment_id,
                video_id,
                review_state
            )
            VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE
                review_state=VALUES(review_state),
                updated_at=(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
        `, [assignment_id, video_id, review_state]);
    }

    async remove(assignment_id: number, video_id: number): Promise<void>
    {
        await this.run(`
            DELETE FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ? AND video_id = ?
        `, [assignment_id, video_id]);
    }

    async get(
        assignment_id: number,
        video_id: number
    ): Promise<VirtualChannelAssignmentVideoSelection | undefined>
    {
        return this.getOne<VirtualChannelAssignmentVideoSelection>(`
            SELECT *
            FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ? AND video_id = ?
        `, [assignment_id, video_id]);
    }

    async listForAssignment(assignment_id: number): Promise<VirtualChannelAssignmentVideoSelection[]>
    {
        return this.listRows<VirtualChannelAssignmentVideoSelection>(`
            SELECT *
            FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ?
            ORDER BY updated_at DESC, id DESC
        `, [assignment_id]);
    }
}
// apply-patch-anchor - do not delete



