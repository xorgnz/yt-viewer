import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import {
    insertAssignment,
    insertAssignmentSelection,
    insertSourceChannel,
    insertVideo,
    insertVirtualChannel
} from '../helpers/TestFixtureBuilders';

type ManageRouteModule = typeof import('../../src/routes/admin/virtual-channels/[virtualChannelId]/+page.server');

describe('admin virtual channel manage route', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: ManageRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-manage-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        const db = new Database(path.join(tempDir, 'test.db'));
        applyLatestSchemaBootstrap(db);

        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_ROUTE_1',
            title: 'Route Source 1',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(db, {
            id: 2,
            youtubeId: 'UC_ROUTE_2',
            title: 'Route Source 2',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Route Test Channel' });
        insertAssignment(db, { id: 1, sourceChannelId: 1, virtualChannelId: 1, mode: 'selected_only' });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_ROUTE_1',
            channelId: 1,
            title: 'Route Video 1',
            description: 'First route video',
            publishedAt: 1000,
            durationSeconds: 300,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 2,
            youtubeId: 'VID_ROUTE_2',
            channelId: 1,
            title: 'Route Video 2',
            description: 'Second route video',
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
        db.close();

        routeModule = await import('../../src/routes/admin/virtual-channels/[virtualChannelId]/+page.server');
    });

    afterEach(() => {
        process.env.NODE_ENV = previousNodeEnv;
        if (previousDbDir === undefined) {
            delete process.env.YTCW_DB_DIR;
        } else {
            process.env.YTCW_DB_DIR = previousDbDir;
        }

        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('loads selected-only review data with filter state', async () => {
        const result = await routeModule.load({
            params: { virtualChannelId: '1' },
            url: new URL('http://localhost/admin/virtual-channels/1?reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown&regexFilter-1=route')
        } as any);
        expect(result).toBeTruthy();
        const data = result as Exclude<typeof result, void>;

        expect(data.virtualChannel.name).toBe('Route Test Channel');
        expect(data.associatedSourceChannels).toHaveLength(1);
        expect(data.associatedSourceChannels[0].reviewStateFilter).toBe('not_yet_reviewed');
        expect(data.associatedSourceChannels[0].videoTypeFilter).toBe('unknown');
        expect(data.associatedSourceChannels[0].regexFilter).toBe('route');
        expect(data.associatedSourceChannels[0].selectedOnlyCounts).toEqual({
            included: 1,
            ignored: 0,
            not_yet_reviewed: 1
        });
        expect(data.associatedSourceChannels[0].selectedOnlyVideos.map((video: any) => ({
            id: video.id,
            review_state: video.review_state
        }))).toEqual([
            { id: 2, review_state: 'not_yet_reviewed' },
            { id: 1, review_state: 'included' }
        ]);
    });

    it('bulk updates shown rows and preserves the return query in the redirect', async () => {
        const form = new FormData();
        form.set('assignment_id', '1');
        form.set('review_state', 'ignored');
        form.set('video_ids', '1,2');
        form.set('return_query', 'reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown');

        await expect(routeModule.actions.bulkUpdateVideoReviewState({
            params: { virtualChannelId: '1' },
            request: new Request('http://localhost/admin/virtual-channels/1', {
                method: 'POST',
                body: form
            })
        } as any)).rejects.toMatchObject({
            status: 303,
            location: '/admin/virtual-channels/1?reviewStateFilter-1=not_yet_reviewed&videoTypeFilter-1=unknown'
        });

        const db = new Database(path.join(tempDir, 'test.db'), { readonly: true });
        const rows = db.prepare(`
            SELECT video_id, review_state
            FROM virtual_channel_assignment_video_selections
            WHERE assignment_id = 1
            ORDER BY video_id
        `).all();
        db.close();

        expect(rows).toEqual([
            { video_id: 1, review_state: 'ignored' },
            { video_id: 2, review_state: 'ignored' }
        ]);
    });
});
