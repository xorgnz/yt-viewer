import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import {
    insertProfile,
    insertSourceChannel,
    insertVideo,
    insertVideoFlag
} from '../helpers/TestFixtureBuilders';

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
        applyLatestSchemaBootstrap(db);

        insertProfile(db, { id: 1, key: 'default', name: 'Default' });
        insertProfile(db, { id: 2, key: 'child', name: 'Child' });
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_VIEWER',
            title: 'Viewer Source',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVideo(db, {
            id: 1,
            youtubeId: 'VID_UNWATCHED',
            channelId: 1,
            title: 'Unwatched Video',
            description: '',
            publishedAt: null,
            durationSeconds: 100,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideo(db, {
            id: 2,
            youtubeId: 'VID_WATCHED',
            channelId: 1,
            title: 'Watched Video',
            description: '',
            publishedAt: null,
            durationSeconds: 100,
            thumbnailUrl: null,
            lengthClassification: 'long'
        });
        insertVideoFlag(db, { videoId: 2, profileId: 2, watched: 1, ignored: 0, favorite: 0 });
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
