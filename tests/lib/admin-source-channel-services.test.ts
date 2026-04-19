import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { AdminSourceChannelLookupService } from '../../src/lib/server/admin/AdminSourceChannelLookupService';
import { AdminSourceChannelPageService } from '../../src/lib/server/admin/AdminSourceChannelPageService';
import { AdminSourceChannelYouTubeCoordinator } from '../../src/lib/server/admin/AdminSourceChannelYouTubeCoordinator';
import { AdminYouTubeClientProvider } from '../../src/lib/server/admin/AdminYouTubeClientProvider';
import type { ResolvedChannelReference } from '../../src/lib/youtube/fetch';
import type { ImportResult } from '../../src/lib/youtube/importer';
import type { ChannelsListResponse, YouTubeClient } from '../../src/lib/youtube/youTubeClient';
import { YouTubeApiError } from '../../src/lib/youtube/youTubeClient';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';
import { insertSourceChannel } from '../helpers/TestFixtureBuilders';

class StubClientProvider extends AdminYouTubeClientProvider
{
    override createClient(): YouTubeClient
    {
        return {} as YouTubeClient;
    }
}

class StubYouTubeCoordinator extends AdminSourceChannelYouTubeCoordinator
{
    resolveResult: ResolvedChannelReference = {
        channelId: null,
        normalizedInput: ''
    };
    resolveError: unknown = null;
    metadataResult: ChannelsListResponse['items'][number] | null = null;
    metadataError: unknown = null;
    importResult: ImportResult = {
        channelId: null,
        videosUpserted: 0
    };
    importError: unknown = null;

    override async resolveChannelReference(): Promise<ResolvedChannelReference>
    {
        if (this.resolveError) {
            throw this.resolveError;
        }

        return this.resolveResult;
    }

    override async fetchChannelMetadata(): Promise<ChannelsListResponse['items'][number] | null>
    {
        if (this.metadataError) {
            throw this.metadataError;
        }

        return this.metadataResult;
    }

    override async importChannelFromYouTube(): Promise<ImportResult>
    {
        if (this.importError) {
            throw this.importError;
        }

        return this.importResult;
    }
}

describe('admin source channel services', () => {
    let harness: InMemoryDatabaseHarness;
    let db: Database.Database;

    beforeEach(() => {
        harness = InMemoryDatabaseHarness.createWithLatestSchema();
        db = harness.db;
    });

    afterEach(() => {
        harness.close();
    });

    it('creates a source channel after resolving the submitted YouTube reference', async () => {
        const coordinator = new StubYouTubeCoordinator();
        coordinator.resolveResult = {
            channelId: 'UC_CREATED',
            normalizedInput: '@created'
        };

        const service = new AdminSourceChannelPageService(
            db,
            new SourceChannelDAO(db),
            new StubClientProvider(),
            coordinator
        );

        const result = await service.createSourceChannel({
            youtubeInput: '@created',
            title: 'Created Channel',
            description: 'Created from service test',
            thumbnail_url: 'https://example.test/thumb.jpg',
            published_at: 1234
        });

        expect(result).toEqual({
            ok: true,
            data: {
                redirectTo: '/admin/source-channels'
            }
        });

        const channel = new SourceChannelDAO(db).getByExternalId('UC_CREATED');
        expect(channel?.title).toBe('Created Channel');
        expect(channel?.description).toBe('Created from service test');
    });

    it('maps refresh quota errors to a 429 failure result', async () => {
        insertSourceChannel(db, {
            id: 1,
            youtubeId: 'UC_REFRESH',
            title: 'Refresh Channel',
            description: '',
            thumbnailUrl: null,
            publishedAt: null,
            lastRefreshedAt: null
        });

        const coordinator = new StubYouTubeCoordinator();
        coordinator.importError = new YouTubeApiError(
            'Quota exceeded',
            429,
            '429',
            [{ reason: 'quotaExceeded' }]
        );

        const service = new AdminSourceChannelPageService(
            db,
            new SourceChannelDAO(db),
            new StubClientProvider(),
            coordinator
        );

        const result = await service.refreshSourceChannel({ id: 1 });
        expect(result).toEqual({
            ok: false,
            error: {
                code: 'youtube_quota_exceeded',
                status: 429,
                message: 'YouTube quota exceeded or rate limited. Please try again later.'
            }
        });
    });

    it('returns normalized lookup metadata for a resolved YouTube channel reference', async () => {
        const coordinator = new StubYouTubeCoordinator();
        coordinator.resolveResult = {
            channelId: 'UC_LOOKUP',
            normalizedInput: '@lookup'
        };
        coordinator.metadataResult = {
            id: 'UC_LOOKUP',
            snippet: {
                title: 'Lookup Channel',
                description: 'Lookup description',
                publishedAt: '2024-01-02T00:00:00Z',
                thumbnails: {
                    high: {
                        url: 'https://example.test/high.jpg'
                    }
                }
            }
        };

        const service = new AdminSourceChannelLookupService(
            new StubClientProvider(),
            coordinator
        );

        const result = await service.lookupSourceChannel({ youtubeInput: '@lookup' });
        expect(result).toEqual({
            ok: true,
            data: {
                youtube_id: 'UC_LOOKUP',
                title: 'Lookup Channel',
                description: 'Lookup description',
                thumbnail_url: 'https://example.test/high.jpg',
                published_at: Date.parse('2024-01-02T00:00:00Z')
            }
        });
    });
});
// apply-patch-anchor - do not delete