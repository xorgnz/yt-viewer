import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type SourceChannelsPageRouteModule = typeof import('../../src/routes/admin/source-channels/+page.server');
type SourceChannelsLookupRouteModule = typeof import('../../src/routes/admin/source-channels/lookup/+server');

const fakeDb = {};
const runMock = vi.fn(async (work: (context: { db: typeof fakeDb }) => unknown) => await work({ db: fakeDb }));
const pageService = {
    loadPageData: vi.fn(),
    createSourceChannel: vi.fn(),
    updateSourceChannel: vi.fn(),
    deleteSourceChannel: vi.fn(),
    refreshSourceChannel: vi.fn()
};
const lookupService = {
    lookupSourceChannel: vi.fn()
};
const resolveServiceContextMock = vi.fn(() => ({
    pageService,
    lookupService
}));

vi.mock('$lib/server/ServerDatabaseContext', () => ({
    ServerDatabaseContext: {
        run: runMock
    }
}));

vi.mock('$lib/server/admin/AdminSourceChannelServiceContext', () => ({
    AdminSourceChannelServiceContext: {
        resolve: resolveServiceContextMock
    }
}));

describe('admin source channel routes', () => {
    let pageRoute: SourceChannelsPageRouteModule;
    let lookupRoute: SourceChannelsLookupRouteModule;

    beforeAll(async () => {
        pageRoute = await import('../../src/routes/admin/source-channels/+page.server');
        lookupRoute = await import('../../src/routes/admin/source-channels/lookup/+server');
    });

    beforeEach(() => {
        runMock.mockClear();
        resolveServiceContextMock.mockClear();
        pageService.loadPageData.mockReset();
        pageService.createSourceChannel.mockReset();
        pageService.updateSourceChannel.mockReset();
        pageService.deleteSourceChannel.mockReset();
        pageService.refreshSourceChannel.mockReset();
        lookupService.lookupSourceChannel.mockReset();
    });

    it('loads source channel page data from the page service', async () => {
        pageService.loadPageData.mockReturnValue({
            sourceChannels: [
                {
                    id: 1,
                    youtube_id: 'UC_ROUTE_LOAD',
                    title: 'Loaded Channel'
                }
            ]
        });

        const result = await pageRoute.load({} as never);

        expect(result).toEqual({
            sourceChannels: [
                {
                    id: 1,
                    youtube_id: 'UC_ROUTE_LOAD',
                    title: 'Loaded Channel'
                }
            ]
        });
        expect(runMock).toHaveBeenCalledTimes(1);
        expect(resolveServiceContextMock).toHaveBeenCalledWith(fakeDb);
        expect(pageService.loadPageData).toHaveBeenCalledTimes(1);
    });

    it('redirects after a successful create action using the page service result', async () => {
        pageService.createSourceChannel.mockResolvedValue({
            ok: true,
            data: {
                redirectTo: '/admin/source-channels'
            }
        });

        const form = new FormData();
        form.set('youtube_id', '@created');
        form.set('title', 'Created Route Channel');
        form.set('description', 'Created from route test');
        form.set('thumbnail_url', 'https://example.test/thumb.jpg');
        form.set('published_at', '12345');

        await expect(pageRoute.actions.create({
            request: new Request('http://localhost/admin/source-channels', {
                method: 'POST',
                body: form
            })
        } as never)).rejects.toMatchObject({
            status: 303,
            location: '/admin/source-channels'
        });

        expect(pageService.createSourceChannel).toHaveBeenCalledWith({
            youtubeInput: '@created',
            title: 'Created Route Channel',
            description: 'Created from route test',
            thumbnail_url: 'https://example.test/thumb.jpg',
            published_at: 12345
        });
    });

    it('returns an action failure when create validation passes but the service rejects the request', async () => {
        pageService.createSourceChannel.mockResolvedValue({
            ok: false,
            error: {
                status: 429,
                message: 'YouTube quota exceeded or rate limited. Please try again later.'
            }
        });

        const form = new FormData();
        form.set('youtube_id', '@quota');
        form.set('title', 'Quota Failure');

        const result = await pageRoute.actions.create({
            request: new Request('http://localhost/admin/source-channels', {
                method: 'POST',
                body: form
            })
        } as never);

        expect(result).toEqual({
            status: 429,
            data: {
                message: 'YouTube quota exceeded or rate limited. Please try again later.'
            }
        });
    });

    it('returns lookup JSON when the lookup service resolves a source channel', async () => {
        lookupService.lookupSourceChannel.mockResolvedValue({
            ok: true,
            data: {
                youtube_id: 'UC_LOOKUP_ROUTE',
                title: 'Lookup Route Channel',
                description: 'Lookup route description',
                thumbnail_url: 'https://example.test/high.jpg',
                published_at: 1704153600000
            }
        });

        const response = await lookupRoute.GET({
            url: new URL('http://localhost/admin/source-channels/lookup?youtube_id=@lookup')
        } as never);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                youtube_id: 'UC_LOOKUP_ROUTE',
                title: 'Lookup Route Channel',
                description: 'Lookup route description',
                thumbnail_url: 'https://example.test/high.jpg',
                published_at: 1704153600000
            }
        });
        expect(resolveServiceContextMock).toHaveBeenCalledWith(fakeDb);
        expect(lookupService.lookupSourceChannel).toHaveBeenCalledWith({
            youtubeInput: '@lookup'
        });
    });

    it('maps lookup service failures to JSON error responses', async () => {
        lookupService.lookupSourceChannel.mockResolvedValue({
            ok: false,
            error: {
                status: 404,
                message: 'No YouTube channel could be resolved from that input.'
            }
        });

        const response = await lookupRoute.GET({
            url: new URL('http://localhost/admin/source-channels/lookup?youtube_id=@missing')
        } as never);

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: 'No YouTube channel could be resolved from that input.'
        });
    });
});
