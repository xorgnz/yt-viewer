import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouteDatabaseHarness } from '../helpers/RouteDatabaseHarness';
import {
    insertAssignment,
    insertSourceChannel,
    insertVirtualChannel
} from '../helpers/TestFixtureBuilders';

type IndexRouteModule = typeof import('../../src/routes/admin/virtual-channels/+page.server');

describe('admin virtual channels index route', () => {
    let harness: RouteDatabaseHarness;
    let routeModule: IndexRouteModule;

    beforeEach(async () => {
        harness = RouteDatabaseHarness.create('ytcw-index-route-');
        const { db } = harness;

        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_INDEX_1',
            title: 'Index Source 1',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(db, {
            id: 2,
            youtubeId: 'UC_INDEX_2',
            title: 'Index Source 2',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertSourceChannel(db, {
            id: 3,
            youtubeId: 'UC_INDEX_3',
            title: 'Index Source 3',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });
        insertVirtualChannel(db, { id: 1, name: 'Index Channel 1' });
        insertVirtualChannel(db, { id: 2, name: 'Index Channel 2' });
        insertAssignment(db, { id: 1, sourceChannelId: 1, virtualChannelId: 1, mode: 'all' });
        insertAssignment(db, { id: 2, sourceChannelId: 2, virtualChannelId: 2, mode: 'all' });

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
