import { describe, it, expect, vi, afterEach } from 'vitest';
import { YouTubeClient } from '../../../src/lib/youtube/client';
import { fetchChannelMetadata, fetchChannelWithUploads } from '../../../src/lib/youtube/fetch';

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('YouTube fetch helpers (task 3.2)', () => {
    it('fetchChannelMetadata returns first channel item or null', async () => {
        const fetchMock = vi.fn(async () =>
            okJson({ items: [{ id: 'UC123', contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }] })
        );
        const yt = new YouTubeClient({ apiKey: 'KEY', fetchImpl: fetchMock });
        const ch = await fetchChannelMetadata(yt, 'UC123');
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
        const out = await fetchChannelWithUploads(yt, 'UC123');

        expect(out.uploadsPlaylistId).toBe('UU123');
        expect(out.videos.map((v: any) => v.id)).toEqual(['p1', 'p2', 'p3']);
        // 1 channel + 3 playlist pages
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('fetchChannelWithUploads returns empty when channel not found', async () => {
        const fetchMock = vi.fn(async () => okJson({ items: [] }));
        const yt = new YouTubeClient({ apiKey: 'KEY', fetchImpl: fetchMock });
        const out = await fetchChannelWithUploads(yt, 'UC_NOPE');
        expect(out.channel).toBeNull();
        expect(out.uploadsPlaylistId).toBeNull();
        expect(out.videos).toEqual([]);
    });
});
