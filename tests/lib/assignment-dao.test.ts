import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { AssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';

describe('AssignmentDAO and selection persistence', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);

        db.prepare(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES
                ('UC_ASSIGN_1', 'Assignment Source 1', '', NULL, NULL),
                ('UC_ASSIGN_2', 'Assignment Source 2', '', NULL, NULL)
        `).run();
    });

    it('creates assignments, updates mode, and preserves uniqueness by pair', () => {
        const virtualChannelDao = new VirtualChannelDAO(db);
        const assignmentDao = new AssignmentDAO(db);
        const virtualChannel = virtualChannelDao.create('Assignment Test Channel');

        assignmentDao.add(1, virtualChannel.id, 'all');

        let assignments = assignmentDao.listForVirtualChannel(virtualChannel.id);
        expect(assignments).toHaveLength(1);
        expect(assignments[0].source_channel_id).toBe(1);
        expect(assignments[0].mode).toBe('all');

        assignmentDao.updateMode(assignments[0].id, 'selected_only');

        const updated = assignmentDao.get(assignments[0].id);
        expect(updated?.mode).toBe('selected_only');

        assignmentDao.add(1, virtualChannel.id, 'long_only');

        assignments = assignmentDao.listForVirtualChannel(virtualChannel.id);
        expect(assignments).toHaveLength(1);
        expect(assignments[0].mode).toBe('long_only');

        assignmentDao.add(2, virtualChannel.id, 'all');

        const bySourceChannel = assignmentDao.listForSourceChannel(2);
        expect(bySourceChannel).toHaveLength(1);
        expect(bySourceChannel[0].virtual_channel_id).toBe(virtualChannel.id);
    });

    it('removes only the targeted source-channel and virtual-channel pair', () => {
        const virtualChannelDao = new VirtualChannelDAO(db);
        const assignmentDao = new AssignmentDAO(db);
        const firstVirtualChannel = virtualChannelDao.create('Inline Remove Target');
        const secondVirtualChannel = virtualChannelDao.create('Inline Remove Keep');

        assignmentDao.add(1, firstVirtualChannel.id, 'all');
        assignmentDao.add(1, secondVirtualChannel.id, 'all');

        assignmentDao.remove(1, firstVirtualChannel.id);

        expect(assignmentDao.listForVirtualChannel(firstVirtualChannel.id)).toEqual([]);
        expect(assignmentDao.listForVirtualChannel(secondVirtualChannel.id)).toHaveLength(1);
        expect(assignmentDao.listForSourceChannel(1)).toHaveLength(1);
        expect(assignmentDao.listForSourceChannel(1)[0].virtual_channel_id).toBe(secondVirtualChannel.id);
    });

    it('persists selected-only review state per assignment and video', () => {
        const virtualChannelDao = new VirtualChannelDAO(db);
        const assignmentDao = new AssignmentDAO(db);
        const selectionDao = new VirtualChannelAssignmentVideoSelectionDAO(db);
        const videoDao = new VideoDAO(db);
        const virtualChannel = virtualChannelDao.create('Selected Only Review Test');

        assignmentDao.add(1, virtualChannel.id, 'selected_only');
        const assignment = assignmentDao.listForVirtualChannel(virtualChannel.id)[0];

        videoDao.upsert({
            youtube_id: 'V_ASSIGN_1',
            channel_id: 1,
            title: 'Assignment Review Video',
            description: '',
            published_at: null,
            duration_seconds: null,
            thumbnail_url: null,
            length_classification: 'unknown'
        } as any);

        const video = videoDao.getByExternalId('V_ASSIGN_1')!;

        selectionDao.setReviewState(assignment.id, video.id, 'included');
        let selection = selectionDao.get(assignment.id, video.id);
        expect(selection?.review_state).toBe('included');

        selectionDao.setReviewState(assignment.id, video.id, 'ignored');
        selection = selectionDao.get(assignment.id, video.id);
        expect(selection?.review_state).toBe('ignored');

        const listedSelections = selectionDao.listForAssignment(assignment.id);
        expect(listedSelections).toHaveLength(1);
        expect(listedSelections[0].video_id).toBe(video.id);

        selectionDao.remove(assignment.id, video.id);
        expect(selectionDao.get(assignment.id, video.id)).toBeUndefined();
    });
});
