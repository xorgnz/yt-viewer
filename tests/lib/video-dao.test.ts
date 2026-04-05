import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { AssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';

describe('VideoDAO length classification persistence', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);

        db.prepare(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES('UC_TEST', 'Test Channel', '', NULL, NULL)
        `).run();
    });

    it('defaults missing length classification to unknown', () => {
        const dao = new VideoDAO(db);

        dao.upsert({
            youtube_id: 'V_DEFAULT',
            channel_id: 1,
            title: 'Video Default',
            description: '',
            published_at: null,
            duration_seconds: null,
            thumbnail_url: null
        } as any);

        const video = dao.getByExternalId('V_DEFAULT');
        expect(video?.length_classification).toBe('unknown');
    });

    it('persists an explicit length classification value', () => {
        const dao = new VideoDAO(db);

        dao.upsert({
            youtube_id: 'V_SHORT',
            channel_id: 1,
            title: 'Video Short',
            description: '',
            published_at: null,
            duration_seconds: 30,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);

        const video = dao.getByExternalId('V_SHORT');
        expect(video?.length_classification).toBe('short');
    });

    it('applies assignment mode rules when filtering by virtual channel', () => {
        const dao = new VideoDAO(db);
        const profileDao = new ProfileDAO(db);
        const virtualChannelDao = new VirtualChannelDAO(db);
        const assignmentDao = new AssignmentDAO(db);
        const selectionDao = new VirtualChannelAssignmentVideoSelectionDAO(db);

        dao.upsert({
            youtube_id: 'V_LONG',
            channel_id: 1,
            title: 'Long video',
            description: '',
            published_at: 1000,
            duration_seconds: 600,
            thumbnail_url: null,
            length_classification: 'long'
        } as any);
        dao.upsert({
            youtube_id: 'V_SHORT',
            channel_id: 1,
            title: 'Short video',
            description: '',
            published_at: 2000,
            duration_seconds: 30,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);
        dao.upsert({
            youtube_id: 'V_UNKNOWN',
            channel_id: 1,
            title: 'Unknown video',
            description: '',
            published_at: 3000,
            duration_seconds: null,
            thumbnail_url: null,
            length_classification: 'unknown'
        } as any);

        profileDao.upsertByKey('default', 'Default');
        const profile = profileDao.getByKey('default')!;
        const groupAll = virtualChannelDao.create('All');
        const groupLongOnly = virtualChannelDao.create('Long only');
        const groupSelectedOnly = virtualChannelDao.create('Selected only');

        assignmentDao.add(1, groupAll.id, 'all');
        assignmentDao.add(1, groupLongOnly.id, 'long_only');
        assignmentDao.add(1, groupSelectedOnly.id, 'selected_only');

        const selectedAssignment = assignmentDao.listForVirtualChannel(groupSelectedOnly.id)[0];
        const longVideo = dao.getByExternalId('V_LONG')!;
        const shortVideo = dao.getByExternalId('V_SHORT')!;
        selectionDao.setReviewState(selectedAssignment.id, shortVideo.id, 'included');
        selectionDao.setReviewState(selectedAssignment.id, longVideo.id, 'ignored');

        const allVideos = dao.listForViewer({ groupId: groupAll.id, ignored: 'show' } as any, profile.id);
        const longOnlyVideos = dao.listForViewer({ groupId: groupLongOnly.id, ignored: 'show' } as any, profile.id);
        const selectedOnlyVideos = dao.listForViewer({ groupId: groupSelectedOnly.id, ignored: 'show' } as any, profile.id);

        expect(allVideos.map((video) => video.youtube_id)).toEqual(['V_UNKNOWN', 'V_SHORT', 'V_LONG']);
        expect(longOnlyVideos.map((video) => video.youtube_id)).toEqual(['V_LONG']);
        expect(selectedOnlyVideos.map((video) => video.youtube_id)).toEqual(['V_SHORT']);
    });
});
