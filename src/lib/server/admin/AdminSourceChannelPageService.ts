import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { DatabasePool } from '$lib/daos/shared/DatabasePool';
import type { SourceChannelWithVideoStats } from '$lib/entities/SourceChannelWithVideoStats';
import { VideoDAO } from '$lib/daos/videoDAO';
import { SourceChannel } from '$lib/entities/sourceChannel';
import { ErrorResult, type ErrorFields, type ServiceResult } from '$lib/server/Error';
import { YouTubeChannelImportService } from '$lib/youtube/YouTubeChannelImportService';
import { YouTubeChannelService } from '$lib/youtube/YouTubeChannelService';
import { YouTubeApiError } from '$lib/youtube/youTubeClient';

interface AdminSourceChannelPageData
{
    channels: SourceChannelWithVideoStats[];
}

export class AdminSourceChannelPageService
{
    private static readonly INDEX_PATH = '/admin/source-channels';

    private readonly db: unknown;
    private readonly sourceChannelDAO: SourceChannelDAO;

    constructor(
        db: unknown,
        sourceChannelDAO: SourceChannelDAO
    )
    {
        this.db = db;
        this.sourceChannelDAO = sourceChannelDAO;
    }

    async loadPageData(): Promise<AdminSourceChannelPageData>
    {
        return {
            channels: await this.sourceChannelDAO.listWithVideoStats()
        };
    }

    async createSourceChannel(
        youtubeInput: string,
        title: string,
        description: string,
        thumbnailUrl: string | null,
        publishedAt: number | null
    ): Promise<ServiceResult<
        string,
        ErrorFields
    >>
    {
        let youTubeChannelService: YouTubeChannelService;
        try {
            youTubeChannelService = YouTubeChannelService.createDefault();
        } catch (error: unknown) {
            return this.buildError(
                'youtube_not_configured',
                500,
                this.getErrorMessage(error, 'YouTube API key not configured.')
            );
        }

        try {
            const resolved = await youTubeChannelService.resolveChannelReference(youtubeInput);
            if (!resolved.channelId) {
                return this.buildError(
                    'youtube_reference_invalid',
                    400,
                    'Enter a valid YouTube channel ID, handle, or channel URL.'
                );
            }

            const metadata = await youTubeChannelService.fetchChannelMetadata(resolved.channelId);
            const snippet = metadata?.snippet || {};
            const metadataThumbnailUrl = this.getBestThumbnailUrl(snippet.thumbnails as Record<string, { url?: string }> | undefined);
            const metadataPublishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

            await this.sourceChannelDAO.create(new SourceChannel({
                id: resolved.channelId,
                youtubeId: resolved.channelId,
                title: title || snippet.title || '',
                description: description || snippet.description || '',
                thumbnailUrl: thumbnailUrl || metadataThumbnailUrl,
                publishedAt: publishedAt ?? (
                    Number.isFinite(metadataPublishedAt as number) ? (metadataPublishedAt as number) : null
                ),
                lastRefreshedAt: null
            }));

            return {
                ok: true,
                data: AdminSourceChannelPageService.INDEX_PATH
            };
        } catch (error: unknown) {
            return this.mapYouTubeRequestFailure(
                error,
                'Invalid request to YouTube. Please verify the channel reference and try again.'
            );
        }
    }

    async updateSourceChannel(
        id: string | number,
        title: string,
        description: string,
        thumbnailUrl: string | null,
        publishedAt: number | null
    ): Promise<ServiceResult<
        string,
        ErrorFields<'source_channel_not_found'>
    >>
    {
        const existing = await this.sourceChannelDAO.get(id);
        if (!existing) {
            return this.buildError('source_channel_not_found', 404, 'SourceChannel not found.');
        }

        await this.sourceChannelDAO.update(existing.with({
            title,
            description,
            thumbnailUrl,
            publishedAt
        }));

        return {
            ok: true,
            data: AdminSourceChannelPageService.INDEX_PATH
        };
    }

    async deleteSourceChannel(id: string | number): Promise<string>
    {
        await this.sourceChannelDAO.remove(id);
        return AdminSourceChannelPageService.INDEX_PATH;
    }

    async refreshSourceChannel(id: string | number): Promise<ServiceResult<
        string,
        ErrorFields
    >>
    {
        const existing = await this.sourceChannelDAO.get(id);
        if (!existing) {
            return this.buildError('source_channel_not_found', 404, 'SourceChannel not found.');
        }

        let youTubeChannelService: YouTubeChannelService;
        try {
            youTubeChannelService = YouTubeChannelService.createDefault();
        } catch (error: unknown) {
            return this.buildError(
                'youtube_not_configured',
                500,
                this.getErrorMessage(error, 'YouTube API key not configured.')
            );
        }

        try {
            const database = this.db as DatabasePool;
            const result = await new YouTubeChannelImportService(
                youTubeChannelService,
                new SourceChannelDAO(database),
                new VideoDAO(database)
            ).importChannel(existing.youtubeId);

            if (result.channelId === null) {
                return this.buildError(
                    'youtube_channel_unknown',
                    400,
                    'Invalid or unknown YouTube channel ID. Please verify the ID starts with "UC" and is correct.'
                );
            }

            await this.sourceChannelDAO.markRefreshed(id, Date.now());
            return {
                ok: true,
                data: AdminSourceChannelPageService.INDEX_PATH
            };
        } catch (error: unknown) {
            console.error('Refresh failed for channel', existing.youtubeId, error);
            return this.mapYouTubeRequestFailure(
                error,
                'Invalid request to YouTube. Please verify the channel ID and try again.'
            );
        }
    }

    private mapYouTubeRequestFailure(
        error: unknown,
        invalidRequestMessage: string
    ): ServiceResult<never, ErrorFields>
    {
        if (error instanceof YouTubeApiError) {
            const reasons = (error.errors || []).map((entry) => entry.reason || '').join(',');
            const blob = `${error.code}:${reasons}:${error.message}`;
            const isQuota = /rateLimitExceeded|quotaExceeded/i.test(blob) || error.status === 429;

            if (isQuota) {
                return this.buildError(
                    'youtube_quota_exceeded',
                    429,
                    'YouTube quota exceeded or rate limited. Please try again later.'
                );
            }

            if (error.status === 400 || error.status === 404) {
                return this.buildError('youtube_request_invalid', 400, invalidRequestMessage);
            }

            if (error.status >= 500) {
                return this.buildError(
                    'youtube_service_unavailable',
                    502,
                    'YouTube service is temporarily unavailable. Please try again later.'
                );
            }

            return this.buildError(
                'youtube_request_failed',
                502,
                error.message || 'Failed to refresh from YouTube.'
            );
        }

        const name = this.getErrorName(error);
        if (name === 'AbortError') {
            return this.buildError(
                'youtube_timeout',
                504,
                'Timed out contacting YouTube. Please try again.'
            );
        }

        return this.buildError(
            'youtube_network_error',
            502,
            'Network error contacting YouTube. Please try again later.'
        );
    }

    private buildError<TCode extends string>(
        code: TCode,
        status: number,
        message: string
    ): ServiceResult<never, ErrorFields<TCode>>
    {
        return ErrorResult.error(code, status, message);
    }

    private getErrorMessage(error: unknown, fallback: string): string
    {
        return error instanceof Error ? error.message : fallback;
    }

    private getErrorName(error: unknown): string
    {
        return error instanceof Error ? error.name : '';
    }

    private getBestThumbnailUrl(thumbnails?: Record<string, { url?: string }>): string | null
    {
        if (!thumbnails) {
            return null;
        }

        const prioritizedKeys = ['maxres', 'standard', 'high', 'medium', 'default'];
        for (const key of prioritizedKeys) {
            const url = thumbnails[key]?.url;
            if (url) {
                return url;
            }
        }

        for (const entry of Object.values(thumbnails)) {
            if (entry?.url) {
                return entry.url;
            }
        }

        return null;
    }
}
// apply-patch-anchor - do not delete
