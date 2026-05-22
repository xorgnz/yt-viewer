import { ErrorResult, type ErrorFields, type ServiceResult } from '$lib/server/Error';
import { YouTubeChannelService } from '$lib/youtube/YouTubeChannelService';
import { YouTubeApiError } from '$lib/youtube/youTubeClient';

interface AdminSourceChannelLookupData
{
    youtube_id: string;
    title: string;
    description: string;
    thumbnail_url: string | null;
    published_at: number | null;
}

export class AdminSourceChannelLookupService
{
    async lookupSourceChannel(youtubeInput: string): Promise<ServiceResult<
        AdminSourceChannelLookupData,
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
                    'source_channel_not_found',
                    404,
                    'SourceChannel not found for the provided ID, handle, or URL.'
                );
            }

            const item = await youTubeChannelService.fetchChannelMetadata(resolved.channelId);
            if (!item) {
                return this.buildError(
                    'source_channel_not_found',
                    404,
                    'SourceChannel not found for the provided ID, handle, or URL.'
                );
            }

            return {
                ok: true,
                data: this.buildLookupData(item)
            };
        } catch (error: unknown) {
            return this.mapLookupFailure(error);
        }
    }

    private buildLookupData(item: NonNullable<Awaited<ReturnType<YouTubeChannelService['fetchChannelMetadata']>>>): AdminSourceChannelLookupData
    {
        const snippet = item.snippet || {};
        const thumbUrl = this.getBestThumbnailUrl(snippet.thumbnails as Record<string, { url?: string }> | undefined);
        const publishedAtMs = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

        return {
            youtube_id: item.id,
            title: snippet.title || '',
            description: snippet.description || '',
            thumbnail_url: thumbUrl,
            published_at: typeof publishedAtMs === 'number' && Number.isFinite(publishedAtMs) ? publishedAtMs : null
        };
    }

    private mapLookupFailure(error: unknown): ServiceResult<never, ErrorFields>
    {
        if (error instanceof YouTubeApiError) {
            const reasons = (error.errors || []).map((entry) => entry.reason || '').join(',');
            const blob = `${error.code}:${reasons}:${error.message}`;
            const isQuota = /rateLimitExceeded|quotaExceeded/i.test(blob) || error.status === 429;
            const status = isQuota ? 429 : (error.status >= 400 && error.status < 600 ? error.status : 502);

            return this.buildError(
                isQuota ? 'youtube_quota_exceeded' : 'youtube_request_failed',
                status,
                error.message
            );
        }

        const name = this.getErrorName(error);
        if (name === 'AbortError') {
            return this.buildError('youtube_timeout', 504, 'Timed out contacting YouTube.');
        }

        return this.buildError('youtube_network_error', 502, 'Network error contacting YouTube.');
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
