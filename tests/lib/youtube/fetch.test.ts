import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouTubeClient } from '$lib/youtube/youTubeClient';
import {
    YouTubeChannelDataService,
    YouTubeChannelReferenceResolver
} from '../../../src/lib/youtube/fetch';

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const validChannelId = 'UC1234567890123456789012';

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('YouTube fetch services', () => {
    it('fetchChannelMetadata returns first channel item or null', async () => {
        const fetchMock = vi.fn(async () =>
            okJson({ items: [{ id: 'UC123', contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }] })
        );
        const yt = new YouTubeClient({ apiKey: 'KEY', fetchImpl: fetchMock });
        const service = new YouTubeChannelDataService(yt);
        const ch = await service.fetchChannelMetadata('UC123');
        expect(ch?.id).toBe('UC123');
    });

    it('fetchAllPlaylistItems paginates until nextPageToken is absent', async () => {
        const fetchMock = vi
            .fn()
            // channels call from fetchChannelWithUploads
            .mockResolvedValueOnce(
                okJson({ items: [{ id: 'UC123', contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }] })
            )
            // playlistItems page 1
            .mockResolvedValueOnce(okJson({ items: [{ id: 'p1' }], nextPageToken: 'T2' }))
            // playlistItems page 2
            .mockResolvedValueOnce(okJson({ items: [{ id: 'p2' }], nextPageToken: 'T3' }))
            // playlistItems page 3 (last)
            .mockResolvedValueOnce(okJson({ items: [{ id: 'p3' }] }));

        const yt = new YouTubeClient({ apiKey: 'KEY', fetchImpl: fetchMock });
        const service = new YouTubeChannelDataService(yt);
        const out = await service.fetchChannelWithUploads('UC123');

        expect(out.uploadsPlaylistId).toBe('UU123');
        expect(out.videos.map((v: any) => v.id)).toEqual(['p1', 'p2', 'p3']);
        // 1 channel + 3 playlist pages
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('fetchChannelWithUploads returns empty when channel not found', async () => {
        const fetchMock = vi.fn(async () => okJson({ items: [] }));
        const yt = new YouTubeClient({ apiKey: 'KEY', fetchImpl: fetchMock });
        const service = new YouTubeChannelDataService(yt);
        const out = await service.fetchChannelWithUploads('UC_NOPE');
        expect(out.channel).toBeNull();
        expect(out.uploadsPlaylistId).toBeNull();
        expect(out.videos).toEqual([]);
    });

    it('fetchVideosMetadata batches unique ids into 50-item requests', async () => {
        const client = {
            listVideos: vi
                .fn()
                .mockResolvedValueOnce({ items: Array.from({ length: 50 }, (_, index) => ({ id: `V${index}` })) })
                .mockResolvedValueOnce({ items: [{ id: 'V50' }, { id: 'V51' }] })
        } as unknown as YouTubeClient;

        const service = new YouTubeChannelDataService(client);
        const ids = [
            ...Array.from({ length: 52 }, (_, index) => `V${index}`),
            'V0',
            'V1',
            'V51'
        ];

        const result = await service.fetchVideosMetadata(ids);

        expect(result.map((item) => item.id)).toEqual([
            ...Array.from({ length: 50 }, (_, index) => `V${index}`),
            'V50',
            'V51'
        ]);
        expect(client.listVideos).toHaveBeenCalledTimes(2);
        expect(client.listVideos).toHaveBeenNthCalledWith(1, {
            ids: Array.from({ length: 50 }, (_, index) => `V${index}`),
            parts: ['snippet', 'contentDetails']
        });
        expect(client.listVideos).toHaveBeenNthCalledWith(2, {
            ids: ['V50', 'V51'],
            parts: ['snippet', 'contentDetails']
        });
    });

    it('resolves direct channel ids without fetching the handle page', async () => {
        const metadataService = {
            fetchChannelMetadata: vi.fn()
        } as unknown as YouTubeChannelDataService;
        const resolver = new YouTubeChannelReferenceResolver({} as YouTubeClient, metadataService);

        const result = await resolver.resolveChannelReference(validChannelId);

        expect(result).toEqual({
            channelId: validChannelId,
            normalizedInput: validChannelId
        });
        expect(metadataService.fetchChannelMetadata).not.toHaveBeenCalled();
    });

    it('resolves handle URLs by scraping the page and confirming the channel metadata', async () => {
        const fetchMock = vi.fn(async () => new Response(
            `<script>var ytInitialData = {"externalId":"${validChannelId}"}</script>`,
            { status: 200, headers: { 'content-type': 'text/html' } }
        ));
        const metadataService = {
            fetchChannelMetadata: vi.fn(async () => ({ id: validChannelId }))
        } as unknown as YouTubeChannelDataService;

        vi.stubGlobal('fetch', fetchMock);

        const resolver = new YouTubeChannelReferenceResolver({} as YouTubeClient, metadataService);
        const result = await resolver.resolveChannelReference('https://www.youtube.com/@demo-handle');

        expect(result).toEqual({
            channelId: validChannelId,
            normalizedInput: 'https://www.youtube.com/@demo-handle'
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://www.youtube.com/@demo-handle',
            expect.objectContaining({
                method: 'GET'
            })
        );
        expect(metadataService.fetchChannelMetadata).toHaveBeenCalledWith(validChannelId);
    });
});
// apply-patch-anchor - do not delete