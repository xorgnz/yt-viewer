import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';

type ViewerListRouteModule = typeof import('../../src/routes/viewer/+page.server');

describe('viewer list page load', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: ViewerListRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-viewer-route-'));
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
            VALUES
                (1, 'default', 'Default'),
                (2, 'child', 'Child')
        `).run();
        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES (1, 'UC_VIEWER', 'Viewer Source', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
            VALUES
                (1, 'VID_UNWATCHED', 1, 'Unwatched Video', '', NULL, 100, NULL, 'long'),
                (2, 'VID_WATCHED', 1, 'Watched Video', '', NULL, 100, NULL, 'long')
        `).run();
        db.prepare(`
            INSERT INTO video_flags(video_id, profile_id, watched, ignored, favorite)
            VALUES (2, 2, 1, 0, 0)
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

    function childCookieJar()
    {
        return {
            get(name: string) {
                if (name === 'ytcw_active_profile') return 'child';
                return undefined;
            }
        };
    }

    it('defaults the child profile viewer to unwatched videos', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/viewer'),
            cookies: childCookieJar()
        } as any);

        expect(result.filters.watched).toBe('unwatched');
        expect(result.videos.map((video: { youtube_id: string }) => video.youtube_id)).toEqual(['VID_UNWATCHED']);
    });

    it('allows an explicit watched=all request to override the child default', async () => {
        const result = await routeModule.load({
            url: new URL('http://localhost/viewer?watched=all'),
            cookies: childCookieJar()
        } as any);

        expect(result.filters.watched).toBe('all');
        expect(result.videos.map((video: { youtube_id: string }) => video.youtube_id).sort()).toEqual([
            'VID_UNWATCHED',
            'VID_WATCHED'
        ].sort());
    });
});
