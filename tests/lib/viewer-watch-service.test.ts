import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { FlagsDAO } from '../../src/lib/daos/flagsDAO';
import { HistoryDAO } from '../../src/lib/daos/historyDAO';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { ServerProfileContext } from '../../src/lib/server/ServerProfileContext';
import { ViewerWatchService } from '../../src/lib/server/viewer/ViewerWatchService';

describe('ViewerWatchService', () => {
    function createService()
    {
        const db = new Database(':memory:');
        applyLatestSchemaBootstrap(db);

        // Seed the minimum viewer-watch dataset for service-level tests.
        const profileDAO = new ProfileDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const videoDAO = new VideoDAO(db);
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
            published_at: null,
            duration_seconds: 600,
            thumbnail_url: null
        } as any);

        const profileContext = ServerProfileContext.resolve(profileDAO, {
            get() {
                return 'default';
            }
        } as any);

        return {
            db,
            flagsDAO,
            historyDAO,
            service: new ViewerWatchService(
                videoDAO,
                flagsDAO,
                historyDAO,
                profileContext
            )
        };
    }

    it('loads the viewer watch page model in the active profile context', () => {
        const { db, service } = createService();

        const result = service.load('WATCH_ME');

        expect(result).toMatchObject({
            profileId: 1,
            profileKey: 'default',
            profileName: 'Adult'
        });
        expect(result?.video.youtube_id).toBe('WATCH_ME');

        db.close();
    });

    it('creates and updates watch history independently of watched flags', () => {
        const { db, flagsDAO, historyDAO, service } = createService();

        const createResult = service.createHistorySession('WATCH_ME', 8, 1000);
        const updateResult = service.updateHistoryProgress('WATCH_ME', 21, 2000);

        const flagValues = flagsDAO.getValueMap([1], 1, 'watched');
        const session = historyDAO.findMostRecentSession(1, 1);

        expect(createResult).toEqual({ ok: true });
        expect(updateResult).toEqual({ ok: true });
        expect(flagValues.get(1)).toBe(0);
        expect(session?.time_watched_seconds).toBe(21);

        db.close();
    });

    it('returns status-bearing failures for missing videos and stale sessions', () => {
        const { db, service } = createService();

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

        db.close();
    });
});
