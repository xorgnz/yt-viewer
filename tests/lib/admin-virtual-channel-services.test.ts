import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AssignmentDAO } from '../../src/lib/daos/assignmentDAO';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '../../src/lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';
import { AdminVirtualChannelIndexService } from '../../src/lib/server/admin/AdminVirtualChannelIndexService';
import { AdminVirtualChannelManageService } from '../../src/lib/server/admin/AdminVirtualChannelManageService';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';
import {
    insertAssignment,
    insertAssignmentSelection,
    insertSourceChannel,
    insertVideo,
    insertVirtualChannel
} from '../helpers/TestFixtureBuilders';

describe('admin virtual channel services', () => {
    let harness: InMemoryDatabaseHarness;
    let db: Database.Database;

    beforeEach(() => {
        harness = InMemoryDatabaseHarness.createWithLatestSchema();
        db = harness.db;
    });

    afterEach(() => {
        harness.close();
    });

    function createIndexService(): AdminVirtualChannelIndexService
    {
        return new AdminVirtualChannelIndexService(
            new VirtualChannelDAO(db),
            new AssignmentDAO(db),
            new SourceChannelDAO(db)
        );
    }

    function createManageService(): AdminVirtualChannelManageService
    {
        return new AdminVirtualChannelManageService(
            new VirtualChannelDAO(db),
            new AssignmentDAO(db),
            new SourceChannelDAO(db),
            new VideoDAO(db),
            new VirtualChannelAssignmentVideoSelectionDAO(db)
        );
    }

    it('adds an inline association and returns the refreshed virtual channel row', async () => {
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_INDEX_1',
            title: 'Index Source 1',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(db, {
            id: 2,
            youtubeId: 'UC_INDEX_2',
            title: 'Index Source 2',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(db, {
            id: 3,
            youtubeId: 'UC_INDEX_3',
            title: 'Index Source 3',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Index Channel 1' });
        insertAssignment(db, { id: 1, sourceChannelId: 1, virtualChannelId: 1, mode: 'all' });

        const result = await createIndexService().addInlineAssociation({
            virtualChannelId: 1,
            sourceChannelId: 3
        });

        expect(result).toMatchObject({
            ok: true,
            data: {
                group: {
                    id: 1,
                    name: 'Index Channel 1',
                    availableSourceChannels: [
                        expect.objectContaining({
                            id: 2,
                            title: 'Index Source 2'
                        })
                    ]
                },
                message: 'Source channel added.',
                virtualChannelId: 1
            }
        });

        if (!result.ok) {
            throw new Error('Expected inline association to succeed.');
        }

        expect(result.data.group.associatedSourceChannels).toHaveLength(2);
        expect(result.data.group.associatedSourceChannels[0]).toMatchObject({
            assignment: {
                id: 1,
                source_channel_id: 1,
                virtual_channel_id: 1,
                mode: 'all'
            },
            sourceChannel: {
                id: 1,
                title: 'Index Source 1'
            }
        });
        expect(result.data.group.associatedSourceChannels[1]).toMatchObject({
            assignment: {
                source_channel_id: 3,
                virtual_channel_id: 1,
                mode: 'all'
            },
            sourceChannel: {
                id: 3,
                title: 'Index Source 3'
            }
        });
    });

    it('reports a missing assignment when inline removal targets an unassociated source channel', async () => {
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_REMOVE',
            title: 'Remove Source',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Remove Channel' });

        const result = await createIndexService().removeInlineAssociation({
            virtualChannelId: 1,
            sourceChannelId: 1
        });

        expect(result).toEqual({
            ok: false,
            error: {
                code: 'assignment_not_found',
                status: 404,
                message: 'Assignment not found.',
                virtualChannelId: 1
            }
        });
    });

    it('loads selected-only review data with assignment-level filter state', async () => {
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_MANAGE_1',
            title: 'Manage Source 1',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Manage Channel' });
        insertAssignment(db, { id: 1, sourceChannelId: 1, virtualChannelId: 1, mode: 'selected_only' });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_MANAGE_1',
            channelId: 1,
            title: 'Manage Video 1',
            description: 'First manage video',
            publishedAt: 1000,
            durationSeconds: 300,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 2,
            youtubeId: 'VID_MANAGE_2',
            channelId: 1,
            title: 'Manage Video 2',
            description: 'Second manage video',
            publishedAt: 2000,
            durationSeconds: null,
            thumbnailUrl: null,
            lengthClassification: 'unknown'
        });
        insertAssignmentSelection(db, {
            assignmentId: 1,
            videoId: 1,
            reviewState: 'included'
        });

        const result = await createManageService().loadPageData({
            virtualChannelId: 1,
            searchParams: new URLSearchParams('reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown&regexFilter-1=manage')
        });

        expect(result).toMatchObject({
            ok: true,
            data: {
                virtualChannel: {
                    id: 1,
                    name: 'Manage Channel'
                },
                availableSourceChannels: [
                    expect.objectContaining({
                        id: 1,
                        title: 'Manage Source 1'
                    })
                ]
            }
        });

        if (!result.ok) {
            throw new Error('Expected manage page load to succeed.');
        }

        expect(result.data.associatedSourceChannels).toHaveLength(1);
        expect(result.data.associatedSourceChannels[0]).toMatchObject({
            assignment: expect.objectContaining({
                id: 1,
                mode: 'selected_only'
            }),
            sourceChannel: expect.objectContaining({
                id: 1,
                title: 'Manage Source 1'
            }),
            automaticVideos: [],
            reviewStateFilter: 'not_yet_reviewed',
            regexFilter: 'manage',
            videoTypeFilter: 'unknown',
            selectedOnlyCounts: {
                included: 1,
                ignored: 0,
                not_yet_reviewed: 1
            }
        });
        expect(result.data.associatedSourceChannels[0].selectedOnlyVideos.map((video) => ({
            id: video.id,
            review_state: video.review_state
        }))).toEqual([
            { id: 2, review_state: 'not_yet_reviewed' },
            { id: 1, review_state: 'included' }
        ]);
    });

    it('bulk updates review state through the service and preserves the return query', async () => {
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_BULK',
            title: 'Bulk Source',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Bulk Channel' });
        insertAssignment(db, { id: 1, sourceChannelId: 1, virtualChannelId: 1, mode: 'selected_only' });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_BULK_1',
            channelId: 1,
            title: 'Bulk Video 1',
            description: '',
            publishedAt: null,
            durationSeconds: 120,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 2,
            youtubeId: 'VID_BULK_2',
            channelId: 1,
            title: 'Bulk Video 2',
            description: '',
            publishedAt: null,
            durationSeconds: 120,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });

        const result = await createManageService().bulkUpdateVideoReviewState({
            virtualChannelId: 1,
            assignmentId: 1,
            videoIds: [1, 2],
            reviewState: 'ignored',
            returnQuery: 'reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown'
        });

        const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);

        expect(result).toEqual({
            ok: true,
            data: {
                redirectTo: '/admin/virtual-channels/1?reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown'
            }
        });
        expect(selectionDAO.listForAssignment(1)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                assignment_id: 1,
                video_id: 1,
                review_state: 'ignored'
            }),
            expect.objectContaining({
                assignment_id: 1,
                video_id: 2,
                review_state: 'ignored'
            })
        ]));
    });
});
// apply-patch-anchor - do not delete