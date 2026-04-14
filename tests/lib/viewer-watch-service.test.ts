import { describe, expect, it } from 'vitest';
import { FlagsDAO } from '../../src/lib/daos/flagsDAO';
import { HistoryDAO } from '../../src/lib/daos/historyDAO';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { ViewerVideoReadRepository } from '../../src/lib/daos/readers/ViewerVideoReadRepository';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { ServerProfileContext } from '../../src/lib/server/ServerProfileContext';
import { ViewerWatchService } from '../../src/lib/server/viewer/ViewerWatchService';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';

describe('ViewerWatchService', () => {
    function createService()
    {
        const harness = InMemoryDatabaseHarness.createWithLatestSchema();
        const { db } = harness;

        // Seed the minimum viewer-watch dataset for service-level tests.
        const profileDAO = new ProfileDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const videoDAO = new VideoDAO(db);
        const viewerVideoReadRepository = new ViewerVideoReadRepository(db);
        const flagsDAO = new FlagsDAO(db);
        const historyDAO = new HistoryDAO(db);

        profileDAO.upsertByKey('default', 'Adult');
        sourceChannelDAO.upsert({
            youtube_id: 'UC_WATCH',
            title: 'Watch Source',
            description: '',
            thumbnail_url: null,
            published_at: null
        } as any);

        const sourceChannel = sourceChannelDAO.getByExternalId('UC_WATCH');
        if (!sourceChannel) {
            throw new Error('Failed to seed source channel.');
        }

        videoDAO.upsert({
            youtube_id: 'WATCH_ME',
            channel_id: sourceChannel.id,
            title: 'Watch Me',
            description: '',
            published_at: 2000,
            duration_seconds: 600,
            thumbnail_url: null
        } as any);

        const profileContext = ServerProfileContext.resolve(profileDAO, {
            get() {
                return 'default';
            }
        } as any);

        return {
            harness,
            videoDAO,
            flagsDAO,
            historyDAO,
            service: new ViewerWatchService(
                viewerVideoReadRepository,
                flagsDAO,
                historyDAO,
                profileContext
            )
        };
    }

    it('loads the viewer watch page model in the active profile context', () => {
        const { harness, service } = createService();

        const result = service.load('WATCH_ME');

        expect(result).toMatchObject({
            profileId: 1,
            profileKey: 'default',
            profileName: 'Adult'
        });
        expect(result?.video.youtube_id).toBe('WATCH_ME');

        harness.close();
    });

    it('creates and updates watch history independently of watched flags', () => {
        const { harness, flagsDAO, historyDAO, service } = createService();

        const createResult = service.createHistorySession('WATCH_ME', 8, 1000);
        const updateResult = service.updateHistoryProgress('WATCH_ME', 21, 2000);

        const flagValues = flagsDAO.getValueMap([1], 1, 'watched');
        const session = historyDAO.findMostRecentSession(1, 1);

        expect(createResult).toEqual({ ok: true });
        expect(updateResult).toEqual({ ok: true });
        expect(flagValues.get(1)).toBe(0);
        expect(session?.time_watched_seconds).toBe(21);

        harness.close();
    });

    it('returns status-bearing failures for missing videos and stale sessions', () => {
        const { harness, service } = createService();

        const missingVideoResult = service.setWatched('UNKNOWN', true);
        const sessionCreateResult = service.createHistorySession('WATCH_ME', 8, 1000);
        const staleSessionResult = service.updateHistoryProgress('WATCH_ME', 21, 1000 + (6 * 60 * 1000));

        expect(missingVideoResult).toEqual({
            ok: false,
            status: 404,
            message: 'Video not found'
        });
        expect(sessionCreateResult).toEqual({ ok: true });
        expect(staleSessionResult).toEqual({
            ok: false,
            status: 409,
            message: 'History session is no longer active'
        });

        harness.close();
    });

    it('returns chronological adjacent videos while skipping ignored entries', () => {
        const { harness, videoDAO, flagsDAO, service } = createService();

        videoDAO.upsert({
            youtube_id: 'OLDER_VISIBLE',
            channel_id: 1,
            title: 'Older visible',
            description: '',
            published_at: 1000,
            duration_seconds: 120,
            thumbnail_url: null
        } as any);
        videoDAO.upsert({
            youtube_id: 'OLDER_IGNORED',
            channel_id: 1,
            title: 'Older ignored',
            description: '',
            published_at: 1500,
            duration_seconds: 120,
            thumbnail_url: null
        } as any);
        videoDAO.upsert({
            youtube_id: 'NEWER_WATCHED',
            channel_id: 1,
            title: 'Newer watched',
            description: '',
            published_at: 3000,
            duration_seconds: 120,
            thumbnail_url: null
        } as any);
        videoDAO.upsert({
            youtube_id: 'NEWER_IGNORED',
            channel_id: 1,
            title: 'Newer ignored',
            description: '',
            published_at: 4000,
            duration_seconds: 120,
            thumbnail_url: null
        } as any);

        const olderIgnored = videoDAO.getByExternalId('OLDER_IGNORED');
        const newerWatched = videoDAO.getByExternalId('NEWER_WATCHED');
        const newerIgnored = videoDAO.getByExternalId('NEWER_IGNORED');

        if (!olderIgnored || !newerWatched || !newerIgnored) {
            throw new Error('Failed to seed adjacent videos for watch navigation test.');
        }

        flagsDAO.set(olderIgnored.id, 1, { ignored: 1 });
        flagsDAO.set(newerIgnored.id, 1, { ignored: 1 });
        flagsDAO.set(newerWatched.id, 1, { watched: 1 });

        const result = service.load('WATCH_ME');

        expect(result?.previousVideoYoutubeId).toBe('OLDER_VISIBLE');
        expect(result?.nextVideoYoutubeId).toBe('NEWER_WATCHED');

        harness.close();
    });
});
