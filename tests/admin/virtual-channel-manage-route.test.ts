import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';

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
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }

        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES
                (1, 'UC_ROUTE_1', 'Route Source 1', '', NULL, NULL, NULL),
                (2, 'UC_ROUTE_2', 'Route Source 2', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO virtual_channels(id, name)
            VALUES (1, 'Route Test Channel')
        `).run();
        db.prepare(`
            INSERT INTO virtual_channel_assignments(id, source_channel_id, virtual_channel_id, mode)
            VALUES (1, 1, 1, 'selected_only')
        `).run();
        db.prepare(`
            INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES
                (1, 'VID_ROUTE_1', 1, 'Route Video 1', 'First route video', 1000, 300, NULL, 'long'),
                (2, 'VID_ROUTE_2', 1, 'Route Video 2', 'Second route video', 2000, NULL, NULL, 'unknown')
        `).run();
        db.prepare(`
            INSERT INTO virtual_channel_assignment_video_selections(assignment_id, video_id, review_state)
            VALUES (1, 1, 'included')
        `).run();
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
