import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from '../helpers/RouteDatabaseHarness';

type IndexRouteModule = typeof import('../../src/routes/admin/virtual-channels/+page.server');

describe('admin virtual channels index route', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: IndexRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-index-route-');
        const { db } = harness;

        db.prepare(`
            INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
            VALUES
                (1, 'UC_INDEX_1', 'Index Source 1', '', NULL, NULL, NULL),
                (2, 'UC_INDEX_2', 'Index Source 2', '', NULL, NULL, NULL),
                (3, 'UC_INDEX_3', 'Index Source 3', '', NULL, NULL, NULL)
        `).run();
        db.prepare(`
            INSERT INTO virtual_channels(id, name)
            VALUES
                (1, 'Index Channel 1'),
                (2, 'Index Channel 2')
        `).run();
        db.prepare(`
            INSERT INTO virtual_channel_assignments(id, source_channel_id, virtual_channel_id, mode)
            VALUES
                (1, 1, 1, 'all'),
                (2, 2, 2, 'all')
        `).run();
        db.close();

        routeModule = await import('../../src/routes/admin/virtual-channels/+page.server');
    });

    afterEach(() => {
        harness.dispose();
    });

    it('adds an inline association and returns the refreshed row shape', async () => {
        const form = new FormData();
        form.set('virtual_channel_id', '1');
        form.set('source_channel_id', '3');

        const result = await routeModule.actions.addAssociationInline({
            request: new Request('http://localhost/admin/virtual-channels', {
                method: 'POST',
                body: form
            })
        } as any);

        expect(result?.message).toBe('Source channel added.');
        expect(result?.virtualChannelId).toBe(1);
        expect(result?.group.id).toBe(1);
        expect(result?.group.associatedSourceChannels.map((item: any) => item.sourceChannel?.title)).toEqual([
            'Index Source 1',
            'Index Source 3'
        ]);
        expect(result?.group.availableSourceChannels.map((item: any) => item.title)).toEqual([
            'Index Source 2'
        ]);
    });

    it('fails inline removal cleanly when the assignment is missing', async () => {
        const form = new FormData();
        form.set('virtual_channel_id', '1');
        form.set('source_channel_id', '3');

        const result = await routeModule.actions.removeAssociationInline({
            request: new Request('http://localhost/admin/virtual-channels', {
                method: 'POST',
                body: form
            })
        } as any);

        expect(result?.status).toBe(404);
        expect(result?.data).toEqual({
            message: 'Assignment not found.',
            virtualChannelId: 1
        });
    });
});
