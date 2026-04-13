import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { AssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { ViewerVideoReadRepository } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';

describe('ViewerVideoReadRepository', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);

        db.prepare(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES
                ('UC_TEST', 'Test Channel', '', NULL, NULL),
                ('UC_TEST_2', 'Test Channel 2', '', NULL, NULL)
        `).run();
    });

    it('applies assignment mode rules when filtering by virtual channel', () => {
        const videoDAO = new VideoDAO(db);
        const profileDAO = new ProfileDAO(db);
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const assignmentDAO = new AssignmentDAO(db);
        const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);
        const repository = new ViewerVideoReadRepository(db);

        videoDAO.upsert({
            youtube_id: 'V_LONG',
            channel_id: 1,
            title: 'Long video',
            description: '',
            published_at: 1000,
            duration_seconds: 600,
            thumbnail_url: null,
            length_classification: 'long'
        } as any);
        videoDAO.upsert({
            youtube_id: 'V_SHORT',
            channel_id: 1,
            title: 'Short video',
            description: '',
            published_at: 2000,
            duration_seconds: 30,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);
        videoDAO.upsert({
            youtube_id: 'V_UNKNOWN',
            channel_id: 1,
            title: 'Unknown video',
            description: '',
            published_at: 3000,
            duration_seconds: null,
            thumbnail_url: null,
            length_classification: 'unknown'
        } as any);

        profileDAO.upsertByKey('default', 'Default');
        const profile = profileDAO.getByKey('default')!;
        const groupAll = virtualChannelDAO.create('All');
        const groupLongOnly = virtualChannelDAO.create('Long only');
        const groupSelectedOnly = virtualChannelDAO.create('Selected only');

        assignmentDAO.add(1, groupAll.id, 'all');
        assignmentDAO.add(1, groupLongOnly.id, 'long_only');
        assignmentDAO.add(1, groupSelectedOnly.id, 'selected_only');

        const selectedAssignment = assignmentDAO.listForVirtualChannel(groupSelectedOnly.id)[0];
        const longVideo = videoDAO.getByExternalId('V_LONG')!;
        const shortVideo = videoDAO.getByExternalId('V_SHORT')!;
        selectionDAO.setReviewState(selectedAssignment.id, shortVideo.id, 'included');
        selectionDAO.setReviewState(selectedAssignment.id, longVideo.id, 'ignored');

        const allVideos = repository.list({ groupId: groupAll.id, ignored: 'show' }, profile.id);
        const longOnlyVideos = repository.list({ groupId: groupLongOnly.id, ignored: 'show' }, profile.id);
        const selectedOnlyVideos = repository.list({ groupId: groupSelectedOnly.id, ignored: 'show' }, profile.id);

        expect(allVideos.map((video) => video.youtube_id)).toEqual(['V_UNKNOWN', 'V_SHORT', 'V_LONG']);
        expect(longOnlyVideos.map((video) => video.youtube_id)).toEqual(['V_LONG']);
        expect(selectedOnlyVideos.map((video) => video.youtube_id)).toEqual(['V_SHORT']);
    });

    it('allows unknown videos through selected-only review while keeping long-only restricted', () => {
        const videoDAO = new VideoDAO(db);
        const profileDAO = new ProfileDAO(db);
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const assignmentDAO = new AssignmentDAO(db);
        const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);
        const repository = new ViewerVideoReadRepository(db);

        videoDAO.upsert({
            youtube_id: 'V_SOURCE1_UNKNOWN',
            channel_id: 1,
            title: 'Unknown from source 1',
            description: '',
            published_at: 1000,
            duration_seconds: null,
            thumbnail_url: null,
            length_classification: 'unknown'
        } as any);
        videoDAO.upsert({
            youtube_id: 'V_SOURCE2_LONG',
            channel_id: 2,
            title: 'Long from source 2',
            description: '',
            published_at: 2000,
            duration_seconds: 600,
            thumbnail_url: null,
            length_classification: 'long'
        } as any);
        videoDAO.upsert({
            youtube_id: 'V_SOURCE2_UNKNOWN',
            channel_id: 2,
            title: 'Unknown from source 2',
            description: '',
            published_at: 3000,
            duration_seconds: null,
            thumbnail_url: null,
            length_classification: 'unknown'
        } as any);

        profileDAO.upsertByKey('default', 'Default');
        const profile = profileDAO.getByKey('default')!;
        const mixedGroup = virtualChannelDAO.create('Mixed assignment group');

        assignmentDAO.add(1, mixedGroup.id, 'selected_only');
        assignmentDAO.add(2, mixedGroup.id, 'long_only');

        const selectedAssignment = assignmentDAO.listForSourceChannel(1)[0];
        const unknownFromSource1 = videoDAO.getByExternalId('V_SOURCE1_UNKNOWN')!;
        selectionDAO.setReviewState(selectedAssignment.id, unknownFromSource1.id, 'included');

        const groupVideos = repository.list({ groupId: mixedGroup.id, ignored: 'show' }, profile.id);

        expect(groupVideos.map((video) => video.youtube_id)).toEqual(['V_SOURCE2_LONG', 'V_SOURCE1_UNKNOWN']);
        expect(groupVideos.find((video) => video.youtube_id === 'V_SOURCE2_UNKNOWN')).toBeUndefined();
    });

    it('returns the viewer watch row shape for a single YouTube id', () => {
        const videoDAO = new VideoDAO(db);
        const profileDAO = new ProfileDAO(db);
        const repository = new ViewerVideoReadRepository(db);

        profileDAO.upsertByKey('default', 'Default');
        const profile = profileDAO.getByKey('default')!;
        videoDAO.upsert({
            youtube_id: 'V_WATCH',
            channel_id: 1,
            title: 'Watch row',
            description: 'Loaded through the read repository',
            published_at: 4000,
            duration_seconds: 120,
            thumbnail_url: 'https://example.test/thumb.jpg',
            length_classification: 'long'
        } as any);

        const video = repository.getByYoutubeId('V_WATCH', profile.id);

        expect(video).toMatchObject({
            youtube_id: 'V_WATCH',
            channel_title: 'Test Channel',
            watched: 0,
            favorite: 0,
            ignored: 0
        });
    });

    it('counts the filtered viewer result set without re-running mapping logic in the DAO layer', () => {
        const videoDAO = new VideoDAO(db);
        const profileDAO = new ProfileDAO(db);
        const repository = new ViewerVideoReadRepository(db);

        profileDAO.upsertByKey('default', 'Default');
        const profile = profileDAO.getByKey('default')!;
        videoDAO.upsert({
            youtube_id: 'V_COUNT_1',
            channel_id: 1,
            title: 'Count one',
            description: '',
            published_at: 1000,
            duration_seconds: 60,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);
        videoDAO.upsert({
            youtube_id: 'V_COUNT_2',
            channel_id: 2,
            title: 'Count two',
            description: '',
            published_at: 2000,
            duration_seconds: 120,
            thumbnail_url: null,
            length_classification: 'long'
        } as any);

        expect(repository.count({ channelId: 1 }, profile.id)).toBe(1);
        expect(repository.count({ ignored: 'show' }, profile.id)).toBe(2);
    });
});
