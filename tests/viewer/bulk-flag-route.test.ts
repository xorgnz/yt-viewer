import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';

type ViewerRouteModule = typeof import('../../src/routes/viewer/+page.server');

describe('viewer bulk flag actions', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: ViewerRouteModule;
    let dbPath: string;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-viewer-bulk-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        dbPath = path.join(tempDir, 'test.db');
        const db = new Database(dbPath);
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }

        db.prepare(`
            INSERT INTO profiles(id, key, name)
            VALUES (1, 'default', 'Default')
        `).run();
        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES (1, 'UC_BULK', 'Bulk Source', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES
                (1, 'VID_B1', 1, 'Bulk Video 1', '', NULL, 120, NULL, 'long'),
                (2, 'VID_B2', 1, 'Bulk Video 2', '', NULL, 120, NULL, 'long'),
                (3, 'VID_B3', 1, 'Bulk Video 3', '', NULL, 120, NULL, 'long')
        `).run();
        db.prepare(`
            INSERT INTO video_flags(video_id, profile_id, watched, ignored, favorite, updated_at)
            VALUES
                (1, 1, 0, 0, 0, 0),
                (2, 1, 1, 0, 1, 0),
                (3, 1, 0, 1, 0, 0)
        `).run();
        db.close();

        routeModule = await import('../../src/routes/viewer/+page.server');
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

    function openDb(): Database.Database
    {
        return new Database(dbPath);
    }

    function cookieJar()
    {
        return {
            get(name: string) {
                if (name === 'ytcw_active_profile') return 'default';
                return undefined;
            }
        };
    }

    it('bulk updates watched flags and returns undo data', async () => {
        const form = new FormData();
        form.set('kind', 'watched');
        form.set('value', '1');
        form.set('videoIds', '1,3');
        form.set('selectedCount', '2');
        form.set('spansMultiplePages', '1');
        form.set('selectionContextKey', 'profile=default&watched=all');

        const result = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'watched',
            value: 1,
            selectedCount: 2,
            spansMultiplePages: true,
            requestedCount: 2,
            attemptedCount: 2,
            succeededCount: 2,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 3],
            failedIds: [],
            skippedIds: [],
            message: '2 videos marked watched.'
        });
        expect((result as any).undo).toEqual({
            kind: 'watched',
            value: 1,
            requestedVideoIds: [1, 3],
            originalStates: [
                { videoId: 1, value: 0 },
                { videoId: 3, value: 0 }
            ]
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, watched
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; watched: number }>;
            expect(rows.map((row) => [row.video_id, row.watched])).toEqual([
                [1, 1],
                [2, 1],
                [3, 1]
            ]);
        } finally {
            db.close();
        }
    });

    it('bulk updates favorite flags and returns undo data', async () => {
        const form = new FormData();
        form.set('kind', 'favorite');
        form.set('value', '1');
        form.set('videoIds', '1,3');
        form.set('selectedCount', '2');

        const result = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'favorite',
            value: 1,
            selectedCount: 2,
            requestedCount: 2,
            attemptedCount: 2,
            succeededCount: 2,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 3],
            failedIds: [],
            skippedIds: [],
            message: '2 videos marked favorite.'
        });
        expect((result as any).undo).toEqual({
            kind: 'favorite',
            value: 1,
            requestedVideoIds: [1, 3],
            originalStates: [
                { videoId: 1, value: 0 },
                { videoId: 3, value: 0 }
            ]
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, favorite
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; favorite: number }>;
            expect(rows.map((row) => [row.video_id, row.favorite])).toEqual([
                [1, 1],
                [2, 1],
                [3, 1]
            ]);
        } finally {
            db.close();
        }
    });

    it('bulk updates ignored flags and returns undo data', async () => {
        const form = new FormData();
        form.set('kind', 'ignored');
        form.set('value', '1');
        form.set('videoIds', '1,2');
        form.set('selectedCount', '2');

        const result = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'ignored',
            value: 1,
            selectedCount: 2,
            requestedCount: 2,
            attemptedCount: 2,
            succeededCount: 2,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 2],
            failedIds: [],
            skippedIds: [],
            message: '2 videos marked ignored.'
        });
        expect((result as any).undo).toEqual({
            kind: 'ignored',
            value: 1,
            requestedVideoIds: [1, 2],
            originalStates: [
                { videoId: 1, value: 0 },
                { videoId: 2, value: 0 }
            ]
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, ignored
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; ignored: number }>;
            expect(rows.map((row) => [row.video_id, row.ignored])).toEqual([
                [1, 1],
                [2, 1],
                [3, 1]
            ]);
        } finally {
            db.close();
        }
    });

    it('reports partial success when some requested ids do not exist', async () => {
        const form = new FormData();
        form.set('kind', 'favorite');
        form.set('value', '1');
        form.set('videoIds', '1,999');

        const result = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result).toMatchObject({
            ok: true,
            outcome: 'partial_success',
            kind: 'favorite',
            value: 1,
            requestedCount: 2,
            attemptedCount: 1,
            succeededCount: 1,
            failedCount: 1,
            skippedCount: 0,
            succeededIds: [1],
            failedIds: [999],
            skippedIds: [],
            message: '1 video marked favorite, 1 failed.'
        });
    });

    it('undo restores the original mixed favorite state after a bulk action', async () => {
        const bulkForm = new FormData();
        bulkForm.set('kind', 'favorite');
        bulkForm.set('value', '1');
        bulkForm.set('videoIds', '1,2,3');

        const bulkResult = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: bulkForm
            }),
            cookies: cookieJar()
        } as any);

        expect((bulkResult as any).outcome).toBe('full_success');

        const undoForm = new FormData();
        undoForm.set('kind', 'favorite');
        undoForm.set('videoIds', '1,2,3');
        undoForm.set('originalStates', JSON.stringify((bulkResult as any).undo.originalStates));

        const undoResult = await routeModule.actions.undoBulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: undoForm
            }),
            cookies: cookieJar()
        } as any);

        expect(undoResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'favorite',
            requestedCount: 3,
            attemptedCount: 3,
            succeededCount: 3,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 2, 3],
            failedIds: [],
            skippedIds: [],
            message: '3 videos restored.'
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, favorite
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; favorite: number }>;
            expect(rows.map((row) => [row.video_id, row.favorite])).toEqual([
                [1, 0],
                [2, 1],
                [3, 0]
            ]);
        } finally {
            db.close();
        }
    });

    it('undo restores the original mixed watched state after a bulk action', async () => {
        const bulkForm = new FormData();
        bulkForm.set('kind', 'watched');
        bulkForm.set('value', '1');
        bulkForm.set('videoIds', '1,2,3');

        const bulkResult = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: bulkForm
            }),
            cookies: cookieJar()
        } as any);

        expect((bulkResult as any).outcome).toBe('full_success');

        const undoForm = new FormData();
        undoForm.set('kind', 'watched');
        undoForm.set('videoIds', '1,2,3');
        undoForm.set('originalStates', JSON.stringify((bulkResult as any).undo.originalStates));

        const undoResult = await routeModule.actions.undoBulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: undoForm
            }),
            cookies: cookieJar()
        } as any);

        expect(undoResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'watched',
            requestedCount: 3,
            attemptedCount: 3,
            succeededCount: 3,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 2, 3],
            failedIds: [],
            skippedIds: [],
            message: '3 videos restored.'
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, watched
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; watched: number }>;
            expect(rows.map((row) => [row.video_id, row.watched])).toEqual([
                [1, 0],
                [2, 1],
                [3, 0]
            ]);
        } finally {
            db.close();
        }
    });

    it('undo restores the original mixed ignored state after a bulk action', async () => {
        const bulkForm = new FormData();
        bulkForm.set('kind', 'ignored');
        bulkForm.set('value', '1');
        bulkForm.set('videoIds', '1,2,3');

        const bulkResult = await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: bulkForm
            }),
            cookies: cookieJar()
        } as any);

        expect((bulkResult as any).outcome).toBe('full_success');

        const undoForm = new FormData();
        undoForm.set('kind', 'ignored');
        undoForm.set('videoIds', '1,2,3');
        undoForm.set('originalStates', JSON.stringify((bulkResult as any).undo.originalStates));

        const undoResult = await routeModule.actions.undoBulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: undoForm
            }),
            cookies: cookieJar()
        } as any);

        expect(undoResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'ignored',
            requestedCount: 3,
            attemptedCount: 3,
            succeededCount: 3,
            failedCount: 0,
            skippedCount: 0,
            succeededIds: [1, 2, 3],
            failedIds: [],
            skippedIds: [],
            message: '3 videos restored.'
        });

        const db = openDb();
        try {
            const rows = db.prepare(`
                SELECT video_id, ignored
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; ignored: number }>;
            expect(rows.map((row) => [row.video_id, row.ignored])).toEqual([
                [1, 0],
                [2, 0],
                [3, 1]
            ]);
        } finally {
            db.close();
        }
    });
});
