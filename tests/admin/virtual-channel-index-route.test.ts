import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';

type IndexRouteModule = typeof import('../../src/routes/admin/virtual-channels/+page.server');

describe('admin virtual channels index route', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: IndexRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-index-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        const db = new Database(path.join(tempDir, 'test.db'));
        applyLatestSchemaBootstrap(db);

        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES
                (1, 'UC_INDEX_1', 'Index Source 1', '', NULL, NULL, NULL),
                (2, 'UC_INDEX_2', 'Index Source 2', '', NULL, NULL, NULL),
                (3, 'UC_INDEX_3', 'Index Source 3', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO virtual_channels(id, name)
            VALUES
                (1, 'Index Channel 1'),
                (2, 'Index Channel 2')
        `).run();
        db.prepare(`
            INSERT INTO virtual_channel_assignments(id, source_channel_id, virtual_channel_id, mode)
            VALUES
                (1, 1, 1, 'all'),
                (2, 2, 2, 'all')
        `).run();
        db.close();

        routeModule = await import('../../src/routes/admin/virtual-channels/+page.server');
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

    it('adds an inline association and returns the refreshed row shape', async () => {
        const form = new FormData();
        form.set('virtual_channel_id', '1');
        form.set('source_channel_id', '3');

        const result = await routeModule.actions.addAssociationInline({
            request: new Request('http://localhost/admin/virtual-channels', {
                method: 'POST',
                body: form
            })
        } as any);

        expect(result?.message).toBe('Source channel added.');
        expect(result?.virtualChannelId).toBe(1);
        expect(result?.group.id).toBe(1);
        expect(result?.group.associatedSourceChannels.map((item: any) => item.sourceChannel?.title)).toEqual([
            'Index Source 1',
            'Index Source 3'
        ]);
        expect(result?.group.availableSourceChannels.map((item: any) => item.title)).toEqual([
            'Index Source 2'
        ]);
    });

    it('fails inline removal cleanly when the assignment is missing', async () => {
        const form = new FormData();
        form.set('virtual_channel_id', '1');
        form.set('source_channel_id', '3');

        const result = await routeModule.actions.removeAssociationInline({
            request: new Request('http://localhost/admin/virtual-channels', {
                method: 'POST',
                body: form
            })
        } as any);

        expect(result?.status).toBe(404);
        expect(result?.data).toEqual({
            message: 'Assignment not found.',
            virtualChannelId: 1
        });
    });
});
