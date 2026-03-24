import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import type {
    VirtualChannelAssignmentVideoReviewState,
    VirtualChannelAssignmentVideoSelection
} from '$lib/entities/virtualChannelAssignmentVideoSelection';

export class VirtualChannelAssignmentVideoSelectionDAO extends SqliteDAO
{
    setReviewState(assignment_id: number, video_id: number, review_state: VirtualChannelAssignmentVideoReviewState)
    {
        this.db.prepare(`
            INSERT INTO virtual_channel_assignment_video_selections(
                assignment_id,
                video_id,
                review_state
            )
            VALUES(?,?,?)
            ON CONFLICT(assignment_id, video_id) DO UPDATE SET
                review_state=excluded.review_state,
                updated_at=(strftime('%s','now')*1000)
        `).run(assignment_id, video_id, review_state);
    }

    remove(assignment_id: number, video_id: number)
    {
        this.db.prepare(`
            DELETE FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ? AND video_id = ?
        `).run(assignment_id, video_id);
    }

    get(assignment_id: number, video_id: number): VirtualChannelAssignmentVideoSelection | undefined
    {
        return this.db.prepare(`
            SELECT *
            FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ? AND video_id = ?
        `).get(assignment_id, video_id) as VirtualChannelAssignmentVideoSelection | undefined;
    }

    listForAssignment(assignment_id: number): VirtualChannelAssignmentVideoSelection[]
    {
        return this.db.prepare(`
            SELECT *
            FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = ?
            ORDER BY updated_at DESC, id DESC
        `).all(assignment_id) as VirtualChannelAssignmentVideoSelection[];
    }
}
