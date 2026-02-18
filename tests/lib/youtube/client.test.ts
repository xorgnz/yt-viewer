import { describe, it, expect, vi, afterEach } from 'vitest';
import { YouTubeClient } from '$lib/youtube/youTubeClient';

// Helpers to generate fetch Responses
const okJson = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const errJson = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('YouTubeClient (task 3.1)', () => {
    it('attaches API key and returns parsed JSON on success', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            expect(url).toMatch(/key=TEST_KEY/); // API key must be present in query
            return okJson({ items: [{ id: 'ch1' }] });
        });

        const yt = new YouTubeClient({ apiKey: 'TEST_KEY', fetchImpl: fetchMock });
        const res = await yt.get('channels', { part: 'snippet', id: 'abc' });

        expect(res).toEqual({ items: [{ id: 'ch1' }] });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws a normalized error on 403 with API error details', async () => {
        const fetchMock = vi.fn(async () =>
            errJson(403, { error: { code: 403, message: 'Invalid key', errors: [{ reason: 'keyInvalid' }] } })
        );
        const yt = new YouTubeClient({ apiKey: 'TEST_KEY', fetchImpl: fetchMock, retries: 0 });

        try {
            await yt.get('channels', { part: 'snippet', id: 'abc' });
            throw new Error('Expected to throw');
        } catch (e: any) {
            expect(e).toBeInstanceOf(Error);
            expect(e.status).toBe(403);
            // Ensure message is informative
            expect(String(e.message).toLowerCase()).toContain('invalid');
        }
    });

    it('retries on 5xx and eventually succeeds (exponential backoff)', async () => {
        vi.useFakeTimers();
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(errJson(503, { error: { code: 503 } }))
            .mockResolvedValueOnce(okJson({ items: [1, 2, 3] }));

        const yt = new YouTubeClient({ apiKey: 'TEST_KEY', fetchImpl: fetchMock, retries: 2 });
        const promise = yt.get('playlistItems', { part: 'snippet', playlistId: 'PL123' });

        // Run pending timers to allow backoff delay to elapse
        await vi.runAllTimersAsync();

        const res = await promise;
        expect(res).toEqual({ items: [1, 2, 3] });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('aborts after timeout and retries, then fails when retries exhausted', async () => {
        vi.useFakeTimers();
        // A fetch that only rejects when aborted by the timeout signal
        const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
            return new Promise<Response>((_resolve, reject) => {
                // Simulate a hanging request that gets aborted via AbortController
                const signal = init?.signal as AbortSignal | undefined;
                if (signal) {
                    const onAbort = () => {
                        signal.removeEventListener('abort', onAbort);
                        const err: any = new Error('The operation was aborted');
                        err.name = 'AbortError';
                        reject(err);
                    };
                    signal.addEventListener('abort', onAbort);
                }
                // Never resolve unless aborted
            });
        });

        const yt = new YouTubeClient({ apiKey: 'TEST_KEY', fetchImpl: fetchMock, timeoutMs: 10, retries: 1 });
        const p = yt.get('channels', { part: 'snippet', id: 'abc' }).catch((e) => e);

        // Make backoff deterministic: first retry backoff = 1000ms
        vi.spyOn(Math, 'random').mockReturnValue(0);

        // First attempt times out
        await vi.advanceTimersByTimeAsync(10);
        // Backoff before retry (1000ms when Math.random() = 0)
        await vi.advanceTimersByTimeAsync(1000);
        // Second attempt times out
        await vi.advanceTimersByTimeAsync(10);

        const err = await p;
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(err).toBeInstanceOf(Error);
    });
});
