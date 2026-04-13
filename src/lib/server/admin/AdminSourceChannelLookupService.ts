import { AdminSourceChannelYouTubeCoordinator } from '$lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '$lib/server/admin/AdminYouTubeClientProvider';
import type {
    AdminSourceChannelLookupData,
    AdminSourceChannelServiceError,
    AdminSourceChannelServiceResult,
    LookupAdminSourceChannelInput
} from '$lib/server/admin/AdminSourceChannelTypes';
import { YouTubeApiError } from '$lib/youtube/youTubeClient';

export class AdminSourceChannelLookupService
{
    private readonly clientProvider: AdminYouTubeClientProvider;
    private readonly youTubeCoordinator: AdminSourceChannelYouTubeCoordinator;

    constructor(
        clientProvider: AdminYouTubeClientProvider,
        youTubeCoordinator: AdminSourceChannelYouTubeCoordinator
    )
    {
        this.clientProvider = clientProvider;
        this.youTubeCoordinator = youTubeCoordinator;
    }

    async lookupSourceChannel(input: LookupAdminSourceChannelInput): Promise<AdminSourceChannelServiceResult<
        AdminSourceChannelLookupData,
        AdminSourceChannelServiceError
    >>
    {
        let client;
        try {
            client = this.clientProvider.createClient();
        } catch (error: unknown) {
            return this.buildError(
                'youtube_not_configured',
                500,
                this.getErrorMessage(error, 'YouTube API key not configured.')
            );
        }

        try {
            const resolved = await this.youTubeCoordinator.resolveChannelReference(client, input.youtubeInput);
            if (!resolved.channelId) {
                return this.buildError(
                    'source_channel_not_found',
                    404,
                    'SourceChannel not found for the provided ID, handle, or URL.'
                );
            }

            const item = await this.youTubeCoordinator.fetchChannelMetadata(client, resolved.channelId);
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

    private buildLookupData(item: Awaited<ReturnType<AdminSourceChannelYouTubeCoordinator['fetchChannelMetadata']>> extends infer TItem ? Exclude<TItem, null> : never): AdminSourceChannelLookupData
    {
        const snippet = item.snippet || {};
        const thumbs = snippet.thumbnails;
        const thumbUrl = thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url || null;
        const publishedAtMs = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

        return {
            youtube_id: item.id,
            title: snippet.title || '',
            description: snippet.description || '',
            thumbnail_url: thumbUrl,
            published_at: typeof publishedAtMs === 'number' && Number.isFinite(publishedAtMs) ? publishedAtMs : null
        };
    }

    private mapLookupFailure(error: unknown): AdminSourceChannelServiceResult<never, AdminSourceChannelServiceError>
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
    ): AdminSourceChannelServiceResult<never, AdminSourceChannelServiceError<TCode>>
    {
        return {
            ok: false,
            error: {
                code,
                status,
                message
            }
        };
    }

    private getErrorMessage(error: unknown, fallback: string): string
    {
        return error instanceof Error ? error.message : fallback;
    }

    private getErrorName(error: unknown): string
    {
        return error instanceof Error ? error.name : '';
    }
}
