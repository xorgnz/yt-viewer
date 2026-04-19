import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from './helpers/RouteDatabaseHarness';

type LayoutRouteModule = typeof import('../src/routes/+layout.server');
type LayoutLoadResult = Exclude<Awaited<ReturnType<LayoutRouteModule['load']>>, void>;

describe('root layout route', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: LayoutRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-layout-route-');

        routeModule = await import('../src/routes/+layout.server');
    });

    afterEach(() => {
        harness.dispose();
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
        } as any) as LayoutLoadResult;

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
        } as any) as LayoutLoadResult;

        expect(result.activeProfileKey).toBe('default');
        expect(result.activeProfileName).toBe('Adult');
        expect(result.isAdminLoggedIn).toBe(false);
    });
});
// apply-patch-anchor - do not delete