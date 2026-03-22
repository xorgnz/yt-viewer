import { YouTubeClient } from './youTubeClient';
import type { ChannelsListResponse, PlaylistItemsListResponse } from './youTubeClient';

export interface ChannelWithUploads
{
    channel: ChannelsListResponse['items'][number] | null;
    uploadsPlaylistId: string | null;
    videos: PlaylistItemsListResponse['items'];
}

export interface ResolvedChannelReference
{
    channelId: string | null;
    normalizedInput: string;
}

const YOUTUBE_HANDLE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com'
]);

/**
 * Fetch a single channel object by channel ID. Returns null if not found.
 */
export async function fetchChannelMetadata(yt: YouTubeClient, channelId: string): Promise<ChannelsListResponse['items'][number] | null>
{
    const res = await yt.getChannelById(channelId, ['snippet', 'contentDetails']);
    const item = res?.items?.[0] || null;
    return item ?? null;
}

export async function resolveChannelReference(yt: YouTubeClient, input: string): Promise<ResolvedChannelReference>
{
    const normalizedInput = String(input || '').trim();
    if (!normalizedInput) {
        return { channelId: null, normalizedInput: '' };
    }

    if (isChannelId(normalizedInput)) {
        return { channelId: normalizedInput, normalizedInput };
    }

    const handlePath = extractHandlePath(normalizedInput);
    if (!handlePath) {
        return { channelId: null, normalizedInput };
    }

    const channelId = await resolveChannelIdFromHandlePath(yt, handlePath);
    return { channelId, normalizedInput };
}

/**
 * Fetch all items from a playlist, following page tokens until exhaustion.
 */
export async function fetchAllPlaylistItems(
    yt: YouTubeClient,
    playlistId: string,
    parts: string[] = ['snippet', 'contentDetails']
): Promise<PlaylistItemsListResponse['items']>
{
    const all: PlaylistItemsListResponse['items'] = [];
    let pageToken: string | undefined = undefined;
    do {
        const page = await yt.listPlaylistItems({ playlistId, pageToken, parts, maxResults: 50 });
        if (page?.items?.length) all.push(...page.items);
        pageToken = page.nextPageToken;
    } while (pageToken);
    return all;
}

/**
 * Convenience: fetch channel metadata and all upload videos (via uploads playlist).
 */
export async function fetchChannelWithUploads(yt: YouTubeClient, channelId: string): Promise<ChannelWithUploads>
{
    const channel = await fetchChannelMetadata(yt, channelId);
    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads || null;
    const videos: PlaylistItemsListResponse['items'] = uploadsPlaylistId
        ? await fetchAllPlaylistItems(yt, uploadsPlaylistId)
        : [];
    return { channel, uploadsPlaylistId, videos };
}

function isChannelId(input: string): boolean
{
    return /^UC[a-zA-Z0-9_-]{20,}$/.test(input);
}

function extractHandlePath(input: string): string | null
{
    const trimmed = input.trim();

    if (trimmed.startsWith('@')) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        if (!YOUTUBE_HANDLE_HOSTS.has(url.hostname)) return null;

        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return null;

        if (parts[0].startsWith('@')) {
            return parts[0];
        }

        if (parts[0] === 'channel' && parts[1] && isChannelId(parts[1])) {
            return parts[1];
        }
    } catch {
        if (/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
            return `@${trimmed}`;
        }
    }

    return null;
}

async function resolveChannelIdFromHandlePath(yt: YouTubeClient, handlePath: string): Promise<string | null>
{
    if (isChannelId(handlePath)) {
        return handlePath;
    }

    const cleanPath = handlePath.startsWith('@') ? handlePath : `@${handlePath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`https://www.youtube.com/${cleanPath}`, {
            method: 'GET',
            headers: {
                accept: 'text/html',
                'user-agent': 'Mozilla/5.0'
            },
            signal: controller.signal
        });

        if (!res.ok) {
            return null;
        }

        const html = await res.text();
        const channelId = extractChannelIdFromHtml(html);
        if (!channelId) {
            return null;
        }

        const channel = await fetchChannelMetadata(yt, channelId);
        return channel?.id || null;
    } finally {
        clearTimeout(timeoutId);
    }
}

function extractChannelIdFromHtml(html: string): string | null
{
    const patterns = [
        /"externalId":"(UC[a-zA-Z0-9_-]{20,})"/,
        /"channelId":"(UC[a-zA-Z0-9_-]{20,})"/,
        /https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{20,})/
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
            return match[1];
        }
    }

    return null;
}
