import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '$lib/daos/_schema';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { HistoryReadRepository } from '$lib/daos/readers/HistoryReadRepository';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VideoDAO } from '$lib/daos/videoDAO';

describe('HistoryReadRepository', () => {
    let db: Database.Database;
    let history: HistoryDAO;
    let profileId: number;
    let videoId: number;
    let secondVideoId: number;
    let baseNow: number;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }

        const profiles = new ProfileDAO(db);
        profiles.upsertByKey('default', 'Default');
        profileId = profiles.getByKey('default')!.id;

        const channels = new SourceChannelDAO(db);
        channels.upsert({
            youtube_id: 'UC_HISTORY',
            title: 'History Channel',
            description: '',
            thumbnail_url: null,
            published_at: null
        } as any);
        const channelId = channels.getByExternalId('UC_HISTORY')!.id;

        const videos = new VideoDAO(db);
        videos.upsert({
            youtube_id: 'VID_1',
            channel_id: channelId,
            title: 'Video One',
            description: '',
            published_at: null,
            duration_seconds: 300,
            thumbnail_url: null
        } as any);
        videos.upsert({
            youtube_id: 'VID_2',
            channel_id: channelId,
            title: 'Video Two',
            description: '',
            published_at: null,
            duration_seconds: 180,
            thumbnail_url: null
        } as any);

        videoId = videos.getByExternalId('VID_1')!.id;
        secondVideoId = videos.getByExternalId('VID_2')!.id;
        history = new HistoryDAO(db);
        baseNow = 1_700_000_000_000;
    });

    it('lists chronological session rows with the joined video and channel data', () => {
        const repository = new HistoryReadRepository(db);

        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow + 10_000,
            time_watched_seconds: 15
        });
        history.createSession({
            video_id: secondVideoId,
            profile_id: profileId,
            session_started_at: baseNow + 200_000,
            last_updated_at: baseNow + 205_000,
            time_watched_seconds: 9
        });

        const sessions = repository.listSessions({ profileId });

        expect(sessions).toHaveLength(2);
        expect(sessions[0]).toMatchObject({
            video_id: secondVideoId,
            title: 'Video Two',
            channel_title: 'History Channel',
            session_started_at: baseNow + 200_000
        });
    });

    it('aggregates sessions into per-video summaries while keeping latest timestamps', () => {
        const repository = new HistoryReadRepository(db);

        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow + 10_000,
            time_watched_seconds: 15
        });
        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow + 400_000,
            last_updated_at: baseNow + 410_000,
            time_watched_seconds: 20
        });
        history.createSession({
            video_id: secondVideoId,
            profile_id: profileId,
            session_started_at: baseNow + 200_000,
            last_updated_at: baseNow + 205_000,
            time_watched_seconds: 9
        });

        const summaries = repository.listVideoSummaries({ profileId });

        expect(summaries).toHaveLength(2);
        expect(summaries[0]).toMatchObject({
            video_id: videoId,
            session_count: 2,
            total_time_watched_seconds: 35,
            latest_session_started_at: baseNow + 400_000
        });
    });

    it('filters summary rows by date range when the history page narrows the visible sessions', () => {
        const repository = new HistoryReadRepository(db);

        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow + 10_000,
            time_watched_seconds: 15
        });
        history.createSession({
            video_id: secondVideoId,
            profile_id: profileId,
            session_started_at: baseNow + 200_000,
            last_updated_at: baseNow + 205_000,
            time_watched_seconds: 9
        });

        const summaries = repository.listVideoSummaries({
            profileId,
            dateFrom: baseNow + 100_000
        });

        expect(summaries).toHaveLength(1);
        expect(summaries[0]).toMatchObject({
            video_id: secondVideoId,
            total_time_watched_seconds: 9
        });
    });
});
