import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';

type WatchRouteModule = typeof import('../../src/routes/viewer/watch/[videoId]/+page.server');

describe('viewer watch route actions', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: WatchRouteModule;
    let dbPath: string;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-watch-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        dbPath = path.join(tempDir, 'test.db');
        const db = new Database(dbPath);
        applyLatestSchemaBootstrap(db);

        db.prepare(`
            INSERT INTO profiles(id, key, name)
            VALUES (1, 'default', 'Default')
        `).run();
        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES (1, 'UC_WATCH', 'Watch Source', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES (1, 'WATCH_ME', 1, 'Watch Me', '', NULL, 600, NULL, 'long')
        `).run();
        db.close();

        routeModule = await import('../../src/routes/viewer/watch/[videoId]/+page.server');
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

    it('loads the selected video with the active profile context', async () => {
        const result = await routeModule.load({
            params: { videoId: 'WATCH_ME' },
            cookies: cookieJar()
        } as any);

        expect(result.profileId).toBe(1);
        expect(result.profileKey).toBe('default');
        expect(result.profileName).toBe('Adult');
        expect(result.video.youtube_id).toBe('WATCH_ME');
    });

    it('returns a 404 error when the selected video does not exist', async () => {
        await expect(routeModule.load({
            params: { videoId: 'UNKNOWN' },
            cookies: cookieJar()
        } as any)).rejects.toMatchObject({
            status: 404
        });
    });

    it('manual markWatched sets the watched flag without creating a history row', async () => {
        const form = new FormData();
        form.set('intent', 'watch');

        const result = await routeModule.actions.markWatched({
            request: new Request('http://localhost/viewer/watch/WATCH_ME', {
                method: 'POST',
                body: form
            }),
            params: { videoId: 'WATCH_ME' },
            cookies: cookieJar()
        } as any);

        expect(result).toEqual({
            ok: true,
            watched: 1
        });

        const db = openDb();
        try {
            const flagRow = db.prepare(`SELECT watched FROM video_flags WHERE video_id = 1 AND profile_id = 1`).get() as any;
            const historyCount = db.prepare(`SELECT COUNT(*) AS count FROM watch_history`).get() as any;

            expect(flagRow.watched).toBe(1);
            expect(historyCount.count).toBe(0);
        } finally {
            db.close();
        }
    });

    it('returns a stale-session failure when history progress is no longer active', async () => {
        const db = openDb();
        try {
            db.prepare(`
                INSERT INTO watch_history(
                    video_id,
                    profile_id,
                    session_started_at,
                    last_updated_at,
                    time_watched_seconds
                ) VALUES (1, 1, 0, 0, 8)
            `).run();
        } finally {
            db.close();
        }

        const updateForm = new FormData();
        updateForm.set('watchSeconds', '21');

        const result = await routeModule.actions.updateHistoryProgress({
            request: new Request('http://localhost/viewer/watch/WATCH_ME', {
                method: 'POST',
                body: updateForm
            }),
            params: { videoId: 'WATCH_ME' },
            cookies: cookieJar()
        } as any);

        expect(result?.status).toBe(409);
        expect(result?.data).toEqual({
            message: 'History session is no longer active'
        });
    });

    it('creates and updates history sessions independently of watched state', async () => {
        const createForm = new FormData();
        createForm.set('watchSeconds', '8');

        const createResult = await routeModule.actions.createHistorySession({
            request: new Request('http://localhost/viewer/watch/WATCH_ME', {
                method: 'POST',
                body: createForm
            }),
            params: { videoId: 'WATCH_ME' },
            cookies: cookieJar()
        } as any);

        expect(createResult).toEqual({ ok: true });

        const updateForm = new FormData();
        updateForm.set('watchSeconds', '21');

        const updateResult = await routeModule.actions.updateHistoryProgress({
            request: new Request('http://localhost/viewer/watch/WATCH_ME', {
                method: 'POST',
                body: updateForm
            }),
            params: { videoId: 'WATCH_ME' },
            cookies: cookieJar()
        } as any);

        expect(updateResult).toEqual({ ok: true });

        const db = openDb();
        try {
            const flagCount = db.prepare(`SELECT COUNT(*) AS count FROM video_flags`).get() as any;
            const historyRow = db.prepare(`
                SELECT video_id, profile_id, time_watched_seconds
                FROM watch_history
                ORDER BY id DESC
                LIMIT 1
            `).get() as any;

            expect(flagCount.count).toBe(0);
            expect(historyRow).toMatchObject({
                video_id: 1,
                profile_id: 1,
                time_watched_seconds: 21
            });
        } finally {
            db.close();
        }
    });
});
