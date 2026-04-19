import { describe, expect, it } from 'vitest';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { FlagsDAO } from '../../src/lib/daos/flagsDAO';
import { ViewerFlagService } from '../../src/lib/server/viewer/ViewerFlagService';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';

describe('ViewerFlagService', () => {
    function createService()
    {
        const harness = InMemoryDatabaseHarness.createWithLatestSchema();
        const { db } = harness;

        // Seed a minimal viewer-flag dataset for service-level workflow tests.
        const profileDAO = new ProfileDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const videoDAO = new VideoDAO(db);
        const flagsDAO = new FlagsDAO(db);

        profileDAO.upsertByKey('default', 'Adult');
        const profile = profileDAO.getByKey('default');
        if (!profile) {
            throw new Error('Failed to seed default profile.');
        }

        sourceChannelDAO.upsert({
            youtube_id: 'UC_FLAGS',
            title: 'Flags Source',
            description: '',
            thumbnail_url: null,
            published_at: null
        } as any);
        const sourceChannel = sourceChannelDAO.getByExternalId('UC_FLAGS');
        if (!sourceChannel) {
            throw new Error('Failed to seed source channel.');
        }

        videoDAO.upsert({
            youtube_id: 'VID_1',
            channel_id: sourceChannel.id,
            title: 'Video 1',
            description: '',
            published_at: null,
            duration_seconds: 60,
            thumbnail_url: null
        } as any);
        videoDAO.upsert({
            youtube_id: 'VID_2',
            channel_id: sourceChannel.id,
            title: 'Video 2',
            description: '',
            published_at: null,
            duration_seconds: 60,
            thumbnail_url: null
        } as any);

        const video1 = videoDAO.getByExternalId('VID_1');
        const video2 = videoDAO.getByExternalId('VID_2');
        if (!video1 || !video2) {
            throw new Error('Failed to seed videos.');
        }

        flagsDAO.set(video2.id, profile.id, { watched: 1, favorite: 1 });

        return {
            harness,
            profileId: profile.id,
            video1,
            video2,
            flagsDAO,
            service: new ViewerFlagService(videoDAO, flagsDAO, profile.id)
        };
    }

    it('toggles a single flag through the service boundary', async () => {
        const { harness, profileId, video1, flagsDAO, service } = createService();

        const result = await service.toggleFlag(video1.id, 'favorite', 1);
        const values = flagsDAO.getValueMap([video1.id], profileId, 'favorite');

        expect(result).toMatchObject({
            ok: true,
            videoId: video1.id,
            kind: 'favorite',
            value: 1
        });
        expect(values.get(video1.id)).toBe(1);

        harness.close();
    });

    it('returns undo data and partial-success accounting for bulk updates', async () => {
        const { harness, video1, video2, service } = createService();

        const result = await service.bulkUpdateFlags({
            kind: 'watched',
            value: 1,
            requestedVideoIds: [video1.id, video2.id, 999],
            selectionContextKey: 'profile=default',
            selectedCountHint: 3,
            spansMultiplePages: true
        });

        expect(result).toMatchObject({
            ok: true,
            outcome: 'partial_success',
            kind: 'watched',
            value: 1,
            selectedCount: 3,
            spansMultiplePages: true,
            requestedCount: 3,
            attemptedCount: 2,
            succeededCount: 2,
            failedCount: 1,
            skippedCount: 0,
            succeededIds: [video1.id, video2.id],
            failedIds: [999],
            skippedIds: []
        });
        expect(result.undo.originalStates).toEqual([
            { videoId: video1.id, value: 0 },
            { videoId: video2.id, value: 1 }
        ]);

        harness.close();
    });

    it('restores mixed state through undo and selection restore operations', async () => {
        const { harness, video1, video2, flagsDAO, profileId, service } = createService();

        const undoResult = await service.undoBulkUpdateFlags({
            kind: 'favorite',
            requestedVideoIds: [video1.id, video2.id],
            undoStates: [
                { videoId: video1.id, value: 0 },
                { videoId: video2.id, value: 1 }
            ],
            selectionContextKey: null
        });
        const restoreResult = await service.restoreSelectionState({
            requestedVideoIds: [video1.id, video2.id],
            restoreStates: [
                { videoId: video1.id, watched: 1, favorite: 0, ignored: 0 },
                { videoId: video2.id, watched: 0, favorite: 1, ignored: 1 }
            ],
            selectionContextKey: 'profile=default'
        });

        const watchedMap = flagsDAO.getValueMap([video1.id, video2.id], profileId, 'watched');
        const favoriteMap = flagsDAO.getValueMap([video1.id, video2.id], profileId, 'favorite');
        const ignoredMap = flagsDAO.getValueMap([video1.id, video2.id], profileId, 'ignored');

        expect(undoResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
            kind: 'favorite',
            succeededIds: [video1.id, video2.id]
        });
        expect(restoreResult).toMatchObject({
            ok: true,
            outcome: 'full_success',
            selectionContextKey: 'profile=default',
            succeededIds: [video1.id, video2.id]
        });
        expect(watchedMap.get(video1.id)).toBe(1);
        expect(watchedMap.get(video2.id)).toBe(0);
        expect(favoriteMap.get(video1.id)).toBe(0);
        expect(favoriteMap.get(video2.id)).toBe(1);
        expect(ignoredMap.get(video1.id)).toBe(0);
        expect(ignoredMap.get(video2.id)).toBe(1);

        harness.close();
    });
});
// apply-patch-anchor - do not delete