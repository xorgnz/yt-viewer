import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';

type ViewerVirtualChannelsRouteModule = typeof import('../../src/routes/viewer/virtual-channels/+page.server');

describe('viewer virtual channels route', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: ViewerVirtualChannelsRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-viewer-virtual-channels-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        const db = new Database(path.join(tempDir, 'test.db'));
        applyLatestSchemaBootstrap(db);

        db.prepare(`
            INSERT INTO profiles(id, key, name)
            VALUES
                (1, 'default', 'Default'),
                (2, 'child', 'Child')
        `).run();
        db.prepare(`
            INSERT INTO virtual_channels(id, name)
            VALUES
                (1, 'Zeta Group'),
                (2, 'Alpha Group')
        `).run();
        db.close();

        routeModule = await import('../../src/routes/viewer/virtual-channels/+page.server');
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

    it('loads viewer navigation groups with the active profile key', async () => {
        const result = await routeModule.load({
            cookies: childCookieJar()
        } as any);

        expect(result.profileKey).toBe('child');
        expect(result.groups.map((group: { name: string }) => group.name)).toEqual([
            'Alpha Group',
            'Zeta Group'
        ]);
    });
});
