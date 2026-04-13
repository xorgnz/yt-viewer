import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from '../helpers/RouteDatabaseHarness';
import {
    insertProfile,
    insertVirtualChannel
} from '../helpers/TestFixtureBuilders';

type ViewerVirtualChannelsRouteModule = typeof import('../../src/routes/viewer/virtual-channels/+page.server');

describe('viewer virtual channels route', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: ViewerVirtualChannelsRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-viewer-virtual-channels-route-');

        insertProfile(harness.db, { id: 1, key: 'default', name: 'Default' });
        insertProfile(harness.db, { id: 2, key: 'child', name: 'Child' });
        insertVirtualChannel(harness.db, { id: 1, name: 'Zeta Group' });
        insertVirtualChannel(harness.db, { id: 2, name: 'Alpha Group' });

        routeModule = await import('../../src/routes/viewer/virtual-channels/+page.server');
    });

    afterEach(() => {
        harness.dispose();
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
