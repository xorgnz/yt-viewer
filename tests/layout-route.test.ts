import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../src/lib/daos/shared/LatestSchemaBootstrap';

type LayoutRouteModule = typeof import('../src/routes/+layout.server');

describe('root layout route', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let routeModule: LayoutRouteModule;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-layout-route-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;

        // Create a disposable latest-schema database for the layout route.
        const db = new Database(path.join(tempDir, 'test.db'));
        applyLatestSchemaBootstrap(db);
        db.close();

        routeModule = await import('../src/routes/+layout.server');
    });

    afterEach(() => {
        if (previousNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = previousNodeEnv;
        }

        if (previousDbDir === undefined) {
            delete process.env.YTCW_DB_DIR;
        } else {
            process.env.YTCW_DB_DIR = previousDbDir;
        }

        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    function cookieJar(values: Record<string, string | undefined> = {})
    {
        return {
            get(name: string) {
                return values[name];
            }
        };
    }

    it('loads the active profile and admin state through the shared layout context', async () => {
        const result = await routeModule.load({
            cookies: cookieJar({
                ytcw_active_profile: 'child',
                ytcw_admin: '1'
            })
        } as any);

        expect(result.profiles.map((profile: { key: string; name: string }) => ({
            key: profile.key,
            name: profile.name
        }))).toEqual([
            { key: 'default', name: 'Adult' },
            { key: 'child', name: 'Child' }
        ]);
        expect(result.activeProfileKey).toBe('child');
        expect(result.activeProfileName).toBe('Child');
        expect(result.isAdminLoggedIn).toBe(true);
    });

    it('falls back to the default profile when the cookie is unsupported', async () => {
        const result = await routeModule.load({
            cookies: cookieJar({
                ytcw_active_profile: 'unsupported'
            })
        } as any);

        expect(result.activeProfileKey).toBe('default');
        expect(result.activeProfileName).toBe('Adult');
        expect(result.isAdminLoggedIn).toBe(false);
    });
});
