import type { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { SourceChannel } from '$lib/entities/sourceChannel';
import { AdminSourceChannelYouTubeCoordinator } from '$lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '$lib/server/admin/AdminYouTubeClientProvider';
import type { SourceChannelWithVideoStats } from '$lib/daos/sourceChannelDAO';
import { YouTubeApiError } from '$lib/youtube/youTubeClient';

type AdminSourceChannelDAO = Pick<
    SourceChannelDAO,
    'create' | 'get' | 'listWithVideoStats' | 'markRefreshed' | 'remove' | 'update'
>;

interface AdminSourceChannelServiceError<TCode extends string = string>
{
    code: TCode;
    status: number;
    message: string;
}

type AdminSourceChannelServiceResult<
    TSuccess,
    TError extends AdminSourceChannelServiceError = AdminSourceChannelServiceError
> = {
    ok: true;
    data: TSuccess;
} | {
    ok: false;
    error: TError;
};

interface AdminSourceChannelPageData
{
    channels: SourceChannelWithVideoStats[];
}

export class AdminSourceChannelPageService
{
    private static readonly INDEX_PATH = '/admin/source-channels';

    private readonly db: unknown;
    private readonly sourceChannelDAO: AdminSourceChannelDAO;
    private readonly clientProvider: AdminYouTubeClientProvider;
    private readonly youTubeCoordinator: AdminSourceChannelYouTubeCoordinator;

    constructor(
        db: unknown,
        sourceChannelDAO: AdminSourceChannelDAO,
        clientProvider: AdminYouTubeClientProvider,
        youTubeCoordinator: AdminSourceChannelYouTubeCoordinator
    )
    {
        this.db = db;
        this.sourceChannelDAO = sourceChannelDAO;
        this.clientProvider = clientProvider;
        this.youTubeCoordinator = youTubeCoordinator;
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
    ): Promise<AdminSourceChannelServiceResult<
        string,
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
            const resolved = await this.youTubeCoordinator.resolveChannelReference(client, youtubeInput);
            if (!resolved.channelId) {
                return this.buildError(
                    'youtube_reference_invalid',
                    400,
                    'Enter a valid YouTube channel ID, handle, or channel URL.'
                );
            }

            const metadata = await this.youTubeCoordinator.fetchChannelMetadata(client, resolved.channelId);
            const snippet = metadata?.snippet || {};
            const metadataThumbnailUrl = this.getBestThumbnailUrl(snippet.thumbnails as Record<string, { url?: string }> | undefined);
            const metadataPublishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : null;

            await this.sourceChannelDAO.create(new SourceChannel({
                id: resolved.channelId,
                youtube_id: resolved.channelId,
                title: title || snippet.title || '',
                description: description || snippet.description || '',
                thumbnail_url: thumbnailUrl || metadataThumbnailUrl,
                published_at: publishedAt ?? (
                    Number.isFinite(metadataPublishedAt as number) ? (metadataPublishedAt as number) : null
                ),
                last_refreshed_at: null
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
        id: number,
        title: string,
        description: string,
        thumbnailUrl: string | null,
        publishedAt: number | null
    ): Promise<AdminSourceChannelServiceResult<
        string,
        AdminSourceChannelServiceError<'source_channel_not_found'>
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

    async deleteSourceChannel(id: number): Promise<string>
    {
        await this.sourceChannelDAO.remove(id);
        return AdminSourceChannelPageService.INDEX_PATH;
    }

    async refreshSourceChannel(id: number): Promise<AdminSourceChannelServiceResult<
        string,
        AdminSourceChannelServiceError
    >>
    {
        const existing = await this.sourceChannelDAO.get(id);
        if (!existing) {
            return this.buildError('source_channel_not_found', 404, 'SourceChannel not found.');
        }

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
            const result = await this.youTubeCoordinator.importChannelFromYouTube(
                this.db,
                client,
                existing.youtubeId
            );

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
    ): AdminSourceChannelServiceResult<never, AdminSourceChannelServiceError>
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
