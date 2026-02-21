import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach } from 'vitest';
import { ALL_DDL } from '$lib/daos/_schema';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VideoDAO } from '$lib/daos/videoDAO';
import { ProfileDAO } from '$lib/daos/profileDAO';
import { FlagsDAO } from '$lib/daos/flagsDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';

describe('VideoDAO.listForViewer filters (task 4.1)', () => {
    let db: Database.Database;
    let profileId: number;
    let ch1Id: number;
    let ch2Id: number;
    let gNewsId: number;
    let baseNow: number;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) db.exec(ddl);

        const profiles = new ProfileDAO(db);
        profiles.upsertByKey('default', 'Default');
        profileId = profiles.getByKey('default')!.id;

        const chDao = new SourceChannelDAO(db);
        chDao.upsert({ youtube_id: 'UC_CH1', title: 'SourceChannel One', description: '', thumbnail_url: null, published_at: null } as any);
        chDao.upsert({ youtube_id: 'UC_CH2', title: 'SourceChannel Two', description: '', thumbnail_url: null, published_at: null } as any);
        ch1Id = chDao.getByExternalId('UC_CH1')!.id;
        ch2Id = chDao.getByExternalId('UC_CH2')!.id;

        const cgDao = new VirtualChannelDAO(db);
        gNewsId = cgDao.create('News').id;
        const asg = new AssignmentDAO(db);
        asg.add(ch2Id, gNewsId); // put channel 2 into News group

        const vDao = new VideoDAO(db);
        // Seed videos across channels with varying titles/descriptions and dates
        baseNow = Date.now();
        vDao.upsert({ youtube_id: 'V1', channel_id: ch1Id, title: 'Breaking News: Cats', description: 'fluffy update', published_at: baseNow - 3 * 86400000, duration_seconds: 100, thumbnail_url: null } as any);
        vDao.upsert({ youtube_id: 'V2', channel_id: ch1Id, title: 'Tech Talk', description: 'AI and more', published_at: baseNow - 2 * 86400000, duration_seconds: 200, thumbnail_url: null } as any);
        vDao.upsert({ youtube_id: 'V3', channel_id: ch2Id, title: 'Daily News Recap', description: 'world events', published_at: baseNow - 1 * 86400000, duration_seconds: 300, thumbnail_url: null } as any);
        vDao.upsert({ youtube_id: 'V4', channel_id: ch2Id, title: 'Music Hour', description: 'jazz', published_at: null, duration_seconds: null, thumbnail_url: null } as any);

        // Mark one as watched for the profile
        const flags = new FlagsDAO(db);
        const v2 = vDao.getByExternalId('V2')!;
        flags.set(v2.id, profileId, { watched: 1 });
    });

    it('filters by term (title or description)', () => {
        const vDao = new VideoDAO(db);
        const out = vDao.listForViewer({ term: 'news' }, profileId);
        const ids = out.map(v => v.youtube_id);
        expect(ids).toContain('V1');
        expect(ids).toContain('V3');
        expect(ids).not.toContain('V2');
    });

    it('filters by date range (published_at)', () => {
        const vDao = new VideoDAO(db);
        const twoDaysAgo = baseNow - 2 * 86400000 - 1; // include V2 and V3, exclude V1
        const out = vDao.listForViewer({ dateFrom: twoDaysAgo }, profileId);
        const ids = out.map(v => v.youtube_id);
        expect(ids).toContain('V2');
        expect(ids).toContain('V3');
        expect(ids).not.toContain('V1');
        // Null published_at (V4) should be excluded when using date filters
        expect(ids).not.toContain('V4');
    });

    it('filters by watched status', () => {
        const vDao = new VideoDAO(db);
        const watched = vDao.listForViewer({ watched: 'watched' }, profileId).map(v => v.youtube_id);
        expect(watched).toEqual(['V2']);
        const unwatched = vDao.listForViewer({ watched: 'unwatched' }, profileId).map(v => v.youtube_id);
        expect(unwatched).toContain('V1');
        expect(unwatched).toContain('V3');
        expect(unwatched).toContain('V4');
        expect(unwatched).not.toContain('V2');
    });

    it('filters by channelId', () => {
        const vDao = new VideoDAO(db);
        const out = vDao.listForViewer({ channelId: ch1Id }, profileId);
        const ids = out.map(v => v.youtube_id);
        expect(ids.sort()).toEqual(['V1', 'V2'].sort());
    });

    it('filters by groupId (channels assigned to group)', () => {
        const vDao = new VideoDAO(db);
        const out = vDao.listForViewer({ groupId: gNewsId }, profileId);
        const ids = out.map(v => v.youtube_id);
        // Only channel 2 is in the News group => V3 and V4
        expect(ids.sort()).toEqual(['V3', 'V4'].sort());
    });
});
