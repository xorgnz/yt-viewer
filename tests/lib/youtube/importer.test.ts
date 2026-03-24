import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ALL_DDL } from '../../../src/lib/daos/_schema';
import { importChannelFromYouTube } from '../../../src/lib/youtube/importer';
import type { YouTubeClient } from '$lib/youtube/youTubeClient';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../../src/lib/daos/videoDAO';

describe('youtube importer (task 3.3)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);
    });

    function fakeClient(): YouTubeClient {
        // Provide only the methods used by fetchChannelWithUploads
        const page1 = {
            items: [
                {
                    snippet: {
                        title: 'V1',
                        description: 'First',
                        publishedAt: '2022-01-01T00:00:00Z',
                        resourceId: { videoId: 'V1' },
                        thumbnails: { default: { url: 'http://thumb/v1' } }
                    },
                    contentDetails: { videoId: 'V1', videoPublishedAt: '2022-01-01T00:00:00Z' }
                }
            ],
            nextPageToken: 'N2'
        } as any;
        const page2 = {
            items: [
                {
                    snippet: {
                        title: 'V2',
                        description: 'Second',
                        publishedAt: '2022-01-02T00:00:00Z',
                        resourceId: { videoId: 'V2' },
                        thumbnails: { default: { url: 'http://thumb/v2' } }
                    },
                    contentDetails: { videoId: 'V2', videoPublishedAt: '2022-01-02T00:00:00Z' }
                }
            ]
        } as any;

        const client: any = {
            async getChannelById(id: string) {
                return {
                    items: [
                        {
                            id,
                            snippet: {
                                title: 'Demo SourceChannel',
                                description: 'About',
                                publishedAt: '2020-05-06T07:08:09Z',
                                thumbnails: { high: { url: 'http://thumb/ch' } }
                            },
                            contentDetails: { relatedPlaylists: { uploads: 'UU_uploads' } }
                        }
                    ]
                } as any;
            },
            async listPlaylistItems(params: any) {
                if (!params.pageToken) return page1;
                return page2;
            }
        };
        return client as YouTubeClient;
    }

    it('imports channel and videos, then is idempotent on re-run', async () => {
        const yt = fakeClient();
        const res1 = await importChannelFromYouTube(db, yt, 'UC_DEMO');
        expect(res1.channelId).toBeGreaterThan(0);
        expect(res1.videosUpserted).toBe(2);

        const chDao = new SourceChannelDAO(db);
        const vDao = new VideoDAO(db);
        const ch = chDao.getByExternalId('UC_DEMO');
        expect(ch?.title).toBe('Demo SourceChannel');
        const vids = vDao.listByChannel(ch!.id);
        expect(vids.map(v => v.youtube_id).sort()).toEqual(['V1','V2']);
        expect(vids.every(v => v.length_classification === 'unknown')).toBe(true);

        // Run again; upserts should not duplicate
        const res2 = await importChannelFromYouTube(db, yt, 'UC_DEMO');
        expect(res2.channelId).toBe(res1.channelId);
        const vids2 = vDao.listByChannel(ch!.id);
        expect(vids2.length).toBe(2);
    });
});
