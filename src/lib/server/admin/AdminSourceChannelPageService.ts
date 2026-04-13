import type Database from 'better-sqlite3';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { AdminSourceChannelYouTubeCoordinator } from '$lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '$lib/server/admin/AdminYouTubeClientProvider';
import type {
    AdminSourceChannelPageData,
    AdminSourceChannelRedirect,
    AdminSourceChannelServiceError,
    AdminSourceChannelServiceResult,
    CreateAdminSourceChannelInput,
    DeleteAdminSourceChannelInput,
    RefreshAdminSourceChannelInput,
    UpdateAdminSourceChannelInput
} from '$lib/server/admin/AdminSourceChannelTypes';
import { YouTubeApiError } from '$lib/youtube/youTubeClient';

export class AdminSourceChannelPageService
{
    private static readonly INDEX_PATH = '/admin/source-channels';

    private readonly db: Database.Database;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly clientProvider: AdminYouTubeClientProvider;
    private readonly youTubeCoordinator: AdminSourceChannelYouTubeCoordinator;

    constructor(
        db: Database.Database,
        sourceChannelDAO: SourceChannelDAO,
        clientProvider: AdminYouTubeClientProvider,
        youTubeCoordinator: AdminSourceChannelYouTubeCoordinator
    )
    {
        this.db = db;
        this.sourceChannelDAO = sourceChannelDAO;
        this.clientProvider = clientProvider;
        this.youTubeCoordinator = youTubeCoordinator;
    }

    loadPageData(): AdminSourceChannelPageData
    {
        return {
            channels: this.sourceChannelDAO.list()
        };
    }

    async createSourceChannel(input: CreateAdminSourceChannelInput): Promise<AdminSourceChannelServiceResult<
        AdminSourceChannelRedirect,
        AdminSourceChannelServiceError
    >>
    {
        let client;
        try {
            client = this.clientProvider.createClient();
        } catch (error: any) {
            return this.buildError(
                'youtube_not_configured',
                500,
                error?.message || 'YouTube API key not configured.'
            );
        }

        try {
            const resolved = await this.youTubeCoordinator.resolveChannelReference(client, input.youtubeInput);
            if (!resolved.channelId) {
                return this.buildError(
                    'youtube_reference_invalid',
                    400,
                    'Enter a valid YouTube channel ID, handle, or channel URL.'
                );
            }

            this.sourceChannelDAO.upsert({
                youtube_id: resolved.channelId,
                title: input.title,
                description: input.description,
                thumbnail_url: input.thumbnail_url,
                published_at: input.published_at
            });

            return {
                ok: true,
                data: { redirectTo: AdminSourceChannelPageService.INDEX_PATH }
            };
        } catch (error: any) {
            return this.mapYouTubeRequestFailure(
                error,
                'Invalid request to YouTube. Please verify the channel reference and try again.'
            );
        }
    }

    updateSourceChannel(input: UpdateAdminSourceChannelInput): AdminSourceChannelServiceResult<
        AdminSourceChannelRedirect,
        AdminSourceChannelServiceError<'source_channel_not_found'>
    >
    {
        const existing = this.sourceChannelDAO.get(input.id);
        if (!existing) {
            return this.buildError('source_channel_not_found', 404, 'SourceChannel not found.');
        }

        this.sourceChannelDAO.upsert({
            youtube_id: existing.youtube_id,
            title: input.title,
            description: input.description,
            thumbnail_url: input.thumbnail_url,
            published_at: input.published_at
        });

        return {
            ok: true,
            data: { redirectTo: AdminSourceChannelPageService.INDEX_PATH }
        };
    }

    deleteSourceChannel(input: DeleteAdminSourceChannelInput): AdminSourceChannelRedirect
    {
        this.sourceChannelDAO.remove(input.id);
        return {
            redirectTo: AdminSourceChannelPageService.INDEX_PATH
        };
    }

    async refreshSourceChannel(input: RefreshAdminSourceChannelInput): Promise<AdminSourceChannelServiceResult<
        AdminSourceChannelRedirect,
        AdminSourceChannelServiceError
    >>
    {
        const existing = this.sourceChannelDAO.get(input.id);
        if (!existing) {
            return this.buildError('source_channel_not_found', 404, 'SourceChannel not found.');
        }

        let client;
        try {
            client = this.clientProvider.createClient();
        } catch (error: any) {
            return this.buildError(
                'youtube_not_configured',
                500,
                error?.message || 'YouTube API key not configured.'
            );
        }

        try {
            const result = await this.youTubeCoordinator.importChannelFromYouTube(
                this.db,
                client,
                existing.youtube_id
            );

            if (result.channelId === null) {
                return this.buildError(
                    'youtube_channel_unknown',
                    400,
                    'Invalid or unknown YouTube channel ID. Please verify the ID starts with "UC" and is correct.'
                );
            }

            this.sourceChannelDAO.markRefreshed(input.id, Date.now());
            return {
                ok: true,
                data: { redirectTo: AdminSourceChannelPageService.INDEX_PATH }
            };
        } catch (error: any) {
            console.error('Refresh failed for channel', existing.youtube_id, error);
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

        const name = (error && typeof error === 'object' && 'name' in error) ? String((error as any).name) : '';
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
}
