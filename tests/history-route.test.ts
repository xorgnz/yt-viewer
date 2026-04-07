import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../src/lib/daos/_schema';

type HistoryRouteModule = typeof import('../src/routes/history/+page.server');

describe('history page load', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: HistoryRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-history-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        const db = new Database(path.join(tempDir, 'test.db'));
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }

        db.prepare(`
            INSERT INTO profiles(id, key, name)
            VALUES (1, 'default', 'Default')
        `).run();
        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES
                (1, 'UC_H1', 'History Source 1', '', NULL, NULL, NULL),
                (2, 'UC_H2', 'History Source 2', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES
                (1, 'VID_H1', 1, 'History Video 1', '', NULL, 200, NULL, 'long'),
                (2, 'VID_H2', 2, 'History Video 2', '', NULL, 120, NULL, 'long')
        `).run();
        db.prepare(`
            INSERT INTO watch_history(id, video_id, profile_id, session_started_at, last_updated_at, time_watched_seconds)
            VALUES
                (1, 1, 1, 1700000000000, 1700000009000, 12),
                (2, 1, 1, 1700000600000, 1700000615000, 30),
                (3, 2, 1, 1700000300000, 1700000310000, 18)
        `).run();
        db.close();

        routeModule = await import('../src/routes/history/+page.server');
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

    function cookieJar()
    {
        return {
            get(name: string) {
                if (name === 'ytcw_active_profile') return 'default';
                return undefined;
            }
        };
    }

    it('loads chronological session history by default', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/history'),
            cookies: cookieJar()
        } as any);

        expect(result.filters.mode).toBe('sessions');
        expect(result.items).toHaveLength(3);
        expect(result.items[0]).toMatchObject({
            title: 'History Video 1',
            session_started_at: 1700000600000,
            last_updated_at: 1700000615000,
            time_watched_seconds: 30
        });
    });

    it('loads per-video summary history when mode=videos', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/history?mode=videos'),
            cookies: cookieJar()
        } as any);

        expect(result.filters.mode).toBe('videos');
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toMatchObject({
            title: 'History Video 1',
            session_count: 2,
            total_time_watched_seconds: 42,
            latest_session_started_at: 1700000600000
        });
        expect(result.sessionItems).toHaveLength(3);
    });
});
