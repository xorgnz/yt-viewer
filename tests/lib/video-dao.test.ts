import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { VideoDAO } from '../../src/lib/daos/videoDAO';

describe('VideoDAO length classification persistence', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);

        db.prepare(`
            INSERT INTO source_channels(youtube_id, title, description, thumbnail_url, published_at)
            VALUES
                ('UC_TEST', 'Test Channel', '', NULL, NULL),
                ('UC_TEST_2', 'Test Channel 2', '', NULL, NULL)
        `).run();
    });

    it('defaults missing length classification to unknown', () => {
        const dao = new VideoDAO(db);

        dao.upsert({
            youtube_id: 'V_DEFAULT',
            channel_id: 1,
            title: 'Video Default',
            description: '',
            published_at: null,
            duration_seconds: null,
            thumbnail_url: null
        } as any);

        const video = dao.getByExternalId('V_DEFAULT');
        expect(video?.length_classification).toBe('unknown');
    });

    it('persists an explicit length classification value', () => {
        const dao = new VideoDAO(db);

        dao.upsert({
            youtube_id: 'V_SHORT',
            channel_id: 1,
            title: 'Video Short',
            description: '',
            published_at: null,
            duration_seconds: 30,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);

        const video = dao.getByExternalId('V_SHORT');
        expect(video?.length_classification).toBe('short');
    });

    it('lists existing ids and removes persisted rows cleanly', () => {
        const dao = new VideoDAO(db);

        dao.upsert({
            youtube_id: 'V_REMOVE',
            channel_id: 1,
            title: 'Video Remove',
            description: '',
            published_at: null,
            duration_seconds: 45,
            thumbnail_url: null,
            length_classification: 'short'
        } as any);

        const video = dao.getByExternalId('V_REMOVE');
        if (!video) {
            throw new Error('Expected seeded video to exist.');
        }

        expect(dao.listExistingIds([video.id, 9999])).toEqual([video.id]);

        dao.remove(video.id);

        expect(dao.get(video.id)).toBeUndefined();
    });
});
// apply-patch-anchor - do not delete