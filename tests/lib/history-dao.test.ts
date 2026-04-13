import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '$lib/daos/_schema';
import { HistoryDAO } from '$lib/daos/historyDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VideoDAO } from '$lib/daos/videoDAO';

describe('HistoryDAO session behavior', () => {
    let db: Database.Database;
    let history: HistoryDAO;
    let profileId: number;
    let videoId: number;
    let channelId: number;
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
        channelId = channels.getByExternalId('UC_HISTORY')!.id;

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
        history = new HistoryDAO(db);
        baseNow = 1_700_000_000_000;
    });

    it('creates a session row and returns it as the most recent session', () => {
        const id = history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow,
            time_watched_seconds: 6
        });

        const latest = history.findMostRecentSession(videoId, profileId);

        expect(id).toBeGreaterThan(0);
        expect(latest).toMatchObject({
            id,
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow,
            time_watched_seconds: 6
        });
    });

    it('updates accumulated watch time and last-updated timestamp for an active session', () => {
        const id = history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow,
            time_watched_seconds: 8
        });

        history.updateSessionProgress(id, {
            last_updated_at: baseNow + 12_000,
            time_watched_seconds: 19
        });

        const updated = history.getById(id);
        expect(updated).toMatchObject({
            id,
            last_updated_at: baseNow + 12_000,
            time_watched_seconds: 19
        });
    });

    it('exposes the latest session timestamp needed to reuse sessions within five minutes', () => {
        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow,
            time_watched_seconds: 10
        });
        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow + 120_000,
            last_updated_at: baseNow + 120_000,
            time_watched_seconds: 7
        });

        const latest = history.findMostRecentSession(videoId, profileId);
        const gapMs = (baseNow + 120_000 + 299_000) - latest!.last_updated_at;

        expect(latest!.time_watched_seconds).toBe(7);
        expect(gapMs).toBeLessThan(5 * 60 * 1000);
    });

    it('exposes the latest session timestamp needed to split sessions after five minutes', () => {
        history.createSession({
            video_id: videoId,
            profile_id: profileId,
            session_started_at: baseNow,
            last_updated_at: baseNow,
            time_watched_seconds: 10
        });

        const latest = history.findMostRecentSession(videoId, profileId);
        const gapMs = (baseNow + 301_000) - latest!.last_updated_at;

        expect(gapMs).toBeGreaterThan(5 * 60 * 1000);
    });

});
