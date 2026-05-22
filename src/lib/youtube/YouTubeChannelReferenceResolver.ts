import type { YouTubeClient } from './youTubeClient';
import { YouTubeChannelDataService } from './YouTubeChannelDataService';

export interface ResolvedChannelReference
{
    channelId: string | null;
    normalizedInput: string;
}

export class YouTubeChannelReferenceResolver
{
    private static readonly YOUTUBE_HANDLE_HOSTS = new Set([
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com'
    ]);

    private readonly channelDataService: YouTubeChannelDataService;

    constructor(
        client: YouTubeClient,
        channelDataService: YouTubeChannelDataService = new YouTubeChannelDataService(client)
    )
    {
        this.channelDataService = channelDataService;
    }

    async resolveChannelReference(input: string): Promise<ResolvedChannelReference>
    {
        const normalizedInput = String(input || '').trim();
        if (!normalizedInput) {
            return { channelId: null, normalizedInput: '' };
        }

        if (this.isChannelId(normalizedInput)) {
            return { channelId: normalizedInput, normalizedInput };
        }

        const handlePath = this.extractHandlePath(normalizedInput);
        if (!handlePath) {
            return { channelId: null, normalizedInput };
        }

        const channelId = await this.resolveChannelIdFromHandlePath(handlePath);
        return { channelId, normalizedInput };
    }

    private isChannelId(input: string): boolean
    {
        return /^UC[a-zA-Z0-9_-]{20,}$/.test(input);
    }

    private extractHandlePath(input: string): string | null
    {
        const trimmed = input.trim();

        if (trimmed.startsWith('@')) {
            return trimmed;
        }

        try {
            const url = new URL(trimmed);
            if (!YouTubeChannelReferenceResolver.YOUTUBE_HANDLE_HOSTS.has(url.hostname)) {
                return null;
            }

            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length === 0) {
                return null;
            }

            if (parts[0].startsWith('@')) {
                return parts[0];
            }

            if (parts[0] === 'channel' && parts[1] && this.isChannelId(parts[1])) {
                return parts[1];
            }
        } catch {
            if (/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
                return `@${trimmed}`;
            }
        }

        return null;
    }

    private async resolveChannelIdFromHandlePath(handlePath: string): Promise<string | null>
    {
        if (this.isChannelId(handlePath)) {
            return handlePath;
        }

        const cleanPath = handlePath.startsWith('@') ? handlePath : `@${handlePath}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(`https://www.youtube.com/${cleanPath}`, {
                method: 'GET',
                headers: {
                    accept: 'text/html',
                    'user-agent': 'Mozilla/5.0'
                },
                signal: controller.signal
            });

            if (!response.ok) {
                return null;
            }

            const html = await response.text();
            const channelId = this.extractChannelIdFromHtml(html);
            if (!channelId) {
                return null;
            }

            const channel = await this.channelDataService.fetchChannelMetadata(channelId);
            return channel?.id || null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private extractChannelIdFromHtml(html: string): string | null
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
}
