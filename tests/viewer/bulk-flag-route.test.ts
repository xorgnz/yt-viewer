import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from '../helpers/RouteDatabaseHarness';
import {
    insertProfile,
    insertSourceChannel,
    insertVideo,
    insertVideoFlag
} from '../helpers/TestFixtureBuilders';

type ViewerRouteModule = typeof import('../../src/routes/viewer/+page.server');

describe('viewer bulk flag actions', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: ViewerRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-viewer-bulk-route-');
        const { db } = harness;

        insertProfile(db, { id: 1, key: 'default', name: 'Default' });
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_BULK',
            title: 'Bulk Source',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_B1',
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
            youtubeId: 'VID_B2',
            channelId: 1,
            title: 'Bulk Video 2',
            description: '',
            publishedAt: null,
            durationSeconds: 120,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 3,
            youtubeId: 'VID_B3',
            channelId: 1,
            title: 'Bulk Video 3',
            description: '',
            publishedAt: null,
            durationSeconds: 120,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideoFlag(db, { videoId: 1, profileId: 1, watched: 0, ignored: 0, favorite: 0, updatedAt: 0 });
        insertVideoFlag(db, { videoId: 2, profileId: 1, watched: 1, ignored: 0, favorite: 1, updatedAt: 0 });
        insertVideoFlag(db, { videoId: 3, profileId: 1, watched: 0, ignored: 1, favorite: 0, updatedAt: 0 });
        db.close();

        routeModule = await import('../../src/routes/viewer/+page.server');
    });

    afterEach(() => {
        harness.dispose();
    });

    function openDb(): Database.Database
    {
        return harness.openReadOnly();
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

    it('toggles a single flag through the thin route handler', async () => {
        const form = new FormData();
        form.set('videoId', '1');
        form.set('kind', 'favorite');
        form.set('value', '1');

        const result = await routeModule.actions.toggleFlag({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result).toEqual({
            ok: true,
            videoId: 1,
            kind: 'favorite',
            value: 1
        });

        const db = openDb();
        try {
            const row = db.prepare(`
                SELECT favorite
                FROM video_flags
                WHERE profile_id = 1 AND video_id = 1
            `).get() as { favorite: number };

            expect(row.favorite).toBe(1);
        } finally {
            db.close();
        }
    });

    it('returns a 400 failure when toggle parameters are invalid', async () => {
        const form = new FormData();
        form.set('videoId', '0');
        form.set('kind', 'favorite');
        form.set('value', '1');

        const result = await routeModule.actions.toggleFlag({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: form
            }),
            cookies: cookieJar()
        } as any);

        expect(result?.status).toBe(400);
        expect(result?.data).toEqual({
            message: 'Invalid toggle parameters'
        });
    });

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

    it('reports partial success when bulk undo only restores part of the requested set', async () => {
        const undoForm = new FormData();
        undoForm.set('kind', 'favorite');
        undoForm.set('videoIds', '1,2,999');
        undoForm.set('originalStates', JSON.stringify([
            { videoId: 1, value: 0 }
        ]));

        const undoResult = await routeModule.actions.undoBulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: undoForm
            }),
            cookies: cookieJar()
        } as any);

        expect(undoResult).toMatchObject({
            ok: true,
            outcome: 'partial_success',
            kind: 'favorite',
            requestedCount: 3,
            attemptedCount: 1,
            succeededCount: 1,
            failedCount: 1,
            skippedCount: 1,
            succeededIds: [1],
            failedIds: [999],
            skippedIds: [2],
            message: '1 video restored, 1 failed, 1 skipped.'
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

    it('restores the selected set back to its original multi-flag state after multiple bulk actions', async () => {
        const watchedForm = new FormData();
        watchedForm.set('kind', 'watched');
        watchedForm.set('value', '1');
        watchedForm.set('videoIds', '1,2,3');

        const favoriteForm = new FormData();
        favoriteForm.set('kind', 'favorite');
        favoriteForm.set('value', '1');
        favoriteForm.set('videoIds', '1,2,3');

        await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: watchedForm
            }),
            cookies: cookieJar()
        } as any);

        await routeModule.actions.bulkUpdateFlags({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: favoriteForm
            }),
            cookies: cookieJar()
        } as any);

        const restoreForm = new FormData();
        restoreForm.set('videoIds', '1,2,3');
        restoreForm.set('originalStates', JSON.stringify([
            { videoId: 1, watched: 0, favorite: 0, ignored: 0 },
            { videoId: 2, watched: 1, favorite: 1, ignored: 0 },
            { videoId: 3, watched: 0, favorite: 0, ignored: 1 }
        ]));

        const restoreResult = await routeModule.actions.restoreSelectionState({
            request: new Request('http://localhost/viewer', {
                method: 'POST',
                body: restoreForm
            }),
            cookies: cookieJar()
        } as any);

        expect(restoreResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
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
                SELECT video_id, watched, favorite, ignored
                FROM video_flags
                WHERE profile_id = 1
                ORDER BY video_id
            `).all() as Array<{ video_id: number; watched: number; favorite: number; ignored: number }>;
            expect(rows.map((row) => [row.video_id, row.watched, row.favorite, row.ignored])).toEqual([
                [1, 0, 0, 0],
                [2, 1, 1, 0],
                [3, 0, 0, 1]
            ]);
        } finally {
            db.close();
        }
    });
});
