// YouTube Data API v3 client configuration and request helpers
// Scope: Server-side use from SvelteKit endpoints/actions.
import { env } from '$env/dynamic/private';

export interface YouTubeClientOptions
{
    apiKey?: string;
    baseUrl?: string; // default https://www.googleapis.com/youtube/v3
    userAgent?: string;
    fetchImpl?: typeof fetch; // allow injection for tests
    timeoutMs?: number; // per request timeout
    retries?: number; // transient error retries
}

export class YouTubeClient
{
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly userAgent: string | undefined;
    private readonly fetchImpl: typeof fetch;
    private readonly timeoutMs: number;
    private readonly retries: number;

    constructor(options?: YouTubeClientOptions)
    {
        const envKey = env.YOUTUBE_API_KEY || '';
        this.apiKey = String(options?.apiKey || envKey).trim();
        if (!this.apiKey) {
            throw new Error('YouTubeClient requires an API key. Set YOUTUBE_API_KEY.');
        }
        this.baseUrl = (options?.baseUrl || 'https://www.googleapis.com/youtube/v3').replace(/\/$/, '');
        this.userAgent = options?.userAgent;
        this.fetchImpl = options?.fetchImpl || fetch;
        this.timeoutMs = options?.timeoutMs ?? 15000;
        this.retries = options?.retries ?? 2;
    }

    // Generic GET helper for YouTube Data API v3 endpoints
    // Relaxed generic so callers can specify concrete response interfaces
    async get<T = any>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T>
    {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) q.set(k, String(v));
        }
        q.set('key', this.apiKey);

        const url = `${this.baseUrl}/${path}?${q.toString()}`;

        let attempt = 0;
        while (true) {
            try {
                const res = await this.fetchWithTimeout(url, { method: 'GET', headers: this.headers() });
                const text = await res.text();
                const data = text ? JSON.parse(text) : null;
                if (!res.ok) {
                    const err = toYouTubeError(res.status, data as any);
                    // Retry on 5xx and rate limit
                    if (this.shouldRetry(err) && attempt < this.retries) {
                        attempt++;
                        await delay(backoffMs(attempt));
                        continue;
                    }
                    throw err;
                }
                return data as T;
            } catch (e: any) {
                if (e instanceof YouTubeApiError) {
                    // already classified above; if not retriable or retries exhausted, rethrow
                    if (!this.shouldRetry(e) || attempt >= this.retries) throw e;
                    attempt++;
                    await delay(backoffMs(attempt));
                    continue;
                }
                // Network/timeout errors: retry
                if (attempt < this.retries) {
                    attempt++;
                    await delay(backoffMs(attempt));
                    continue;
                }
                throw e;
            }
        }
    }

    // Decide whether we should retry an error
    protected shouldRetry(e: YouTubeApiError): boolean
    {
        if (isRateLimitError(e)) return true;
        if (e.status >= 500) return true;
        return false;
    }

    private headers(): Record<string, string>
    {
        const h: Record<string, string> = { 'accept': 'application/json' };
        if (this.userAgent) h['user-agent'] = this.userAgent;
        return h;
    }

    private async fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response>
    {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            return await this.fetchImpl(input, { ...init, signal: controller.signal });
        } finally {
            clearTimeout(id);
        }
    }

    // Convenience helpers for common API calls used by this app

    // https://developers.google.com/youtube/v3/docs/channels/list
    async getChannelById(id: string, parts: string[] = ['snippet', 'contentDetails']): Promise<ChannelsListResponse>
    {
        const trimmed = String(id || '').trim();
        if (!trimmed) {
            // Surface a clear early error rather than a vague 400 from the API
            throw new YouTubeApiError('SourceChannel ID is required.', 400, 'invalidParameter');
        }
        const cleanParts = Array.from(new Set((parts || []).map((p) => String(p).trim()).filter(Boolean)));
        if (cleanParts.length === 0) {
            throw new YouTubeApiError('At least one part must be specified.', 400, 'invalidParameter');
        }
        return this.get<ChannelsListResponse>('channels', {
            part: cleanParts.join(','),
            id: trimmed
        });
    }

    // https://developers.google.com/youtube/v3/docs/playlistItems/list
    async listPlaylistItems(params: {
        playlistId: string;
        maxResults?: number; // 1..50
        pageToken?: string;
        parts?: string[]; // default snippet,contentDetails
    }): Promise<PlaylistItemsListResponse>
    {
        const parts = params.parts || ['snippet', 'contentDetails'];
        return await this.get<PlaylistItemsListResponse>('playlistItems', {
            part: parts.join(','),
            playlistId: params.playlistId,
            maxResults: params.maxResults ?? 50,
            pageToken: params.pageToken
        });
    }
}

// Basic error classification for YouTube API
export class YouTubeApiError extends Error
{
    readonly status: number;
    readonly code?: string;
    readonly errors?: Array<{ reason?: string; message?: string; domain?: string }>;

    constructor(message: string, status: number, code?: string, errors?: Array<{ reason?: string; message?: string; domain?: string }>)
    {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }
}

function toYouTubeError(status: number, body: any): YouTubeApiError
{
    const code = body?.error?.code ?? status;
    const msg = body?.error?.message || `YouTube API error (${status})`;
    const errors = body?.error?.errors as Array<{ reason?: string; message?: string; domain?: string }> | undefined;
    return new YouTubeApiError(msg, status, String(code), errors);
}

function delay(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number
{
    // Exponential backoff with jitter: 250ms, 500ms, 1s...
    const base = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    return base + Math.floor(Math.random() * 250);
}

function isRateLimitError(e: YouTubeApiError): boolean
{
    if (e.status === 429) return true;
    const reasons = e.errors?.map(x => x.reason || '').join(',') || '';
    return /rateLimitExceeded|quotaExceeded/i.test(`${e.code}:${reasons}:${e.message}`);
}

// Minimal types for responses we care about
export interface ChannelsListResponse
{
    kind?: string;
    etag?: string;
    pageInfo?: { totalResults?: number; resultsPerPage?: number };
    items: Array<{
        id: string;
        snippet?: {
            title?: string;
            description?: string;
            thumbnails?: {
                default?: { url: string };
                medium?: { url: string };
                high?: { url: string };
            };
            publishedAt?: string;
        };
        contentDetails?: {
            relatedPlaylists?: {
                uploads?: string; // uploads playlist ID
            };
        };
    }>;
}

export interface PlaylistItemsListResponse
{
    kind?: string;
    etag?: string;
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo?: { totalResults?: number; resultsPerPage?: number };
    items: Array<{
        kind?: string;
        etag?: string;
        id?: string;
        snippet?: {
            publishedAt?: string;
            channelId?: string;
            title?: string;
            description?: string;
            thumbnails?: Record<string, { url: string }>;
            channelTitle?: string;
            playlistId?: string;
            position?: number;
            resourceId?: { kind?: string; videoId?: string };
        };
        contentDetails?: {
            videoId?: string;
            videoPublishedAt?: string;
        };
    }>;
}
