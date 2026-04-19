import { describe, expect, it } from 'vitest';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { VideoDAO } from '../../src/lib/daos/videoDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';
import { ServerProfileContext } from '../../src/lib/server/ServerProfileContext';
import { ViewerPageLoader } from '../../src/lib/server/viewer/ViewerPageLoader';
import { ViewerQueryParser } from '../../src/lib/server/viewer/ViewerQueryParser';
import { InMemoryDatabaseHarness } from '../helpers/InMemoryDatabaseHarness';

describe('ViewerPageLoader', () => {
    it('assembles the viewer load model from normalized filters and the active profile', async () => {
        const harness = InMemoryDatabaseHarness.createWithLatestSchema();
        const { db } = harness;

        // Seed the minimum viewer data needed for one assembled load model.
        const profileDAO = new ProfileDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const videoDAO = new VideoDAO(db);
        const virtualChannelDAO = new VirtualChannelDAO(db);

        profileDAO.upsertByKey('default', 'Adult');
        sourceChannelDAO.upsert({
            youtube_id: 'UC_LOAD',
            title: 'Load Source',
            description: '',
            thumbnail_url: null,
            published_at: null
        } as any);

        const sourceChannel = sourceChannelDAO.getByExternalId('UC_LOAD');
        if (!sourceChannel) {
            throw new Error('Failed to seed source channel.');
        }

        videoDAO.upsert({
            youtube_id: 'VID_LOAD',
            channel_id: sourceChannel.id,
            title: 'Load Video',
            description: '',
            published_at: null,
            duration_seconds: 120,
            thumbnail_url: null
        } as any);
        virtualChannelDAO.create('Load Group');

        const profileContext = ServerProfileContext.resolve(profileDAO, {
            get() {
                return 'default';
            }
        } as any);
        const mysqlProvider = {
            async query<T extends object>(sql: string, values: unknown[] = []) {
                const rows = db.prepare(sql).all(...values) as T[];

                return {
                    rows,
                    affectedRows: rows.length,
                    insertId: 0,
                };
            }
        };
        const filters = ViewerQueryParser.parse(new URL('http://localhost/viewer?term=Load'), profileContext.activeProfileKey);
        const result = await new ViewerPageLoader(mysqlProvider as never).load(filters, profileContext);

        expect(result.filters.term).toBe('Load');
        expect(result.profileKey).toBe('default');
        expect(result.profileName).toBe('Adult');
        expect(result.totalCount).toBe(1);
        expect(result.channels.map((channel) => channel.youtube_id)).toEqual(['UC_LOAD']);
        expect(result.groups.map((group) => group.name)).toEqual(['Load Group']);
        expect(result.videos.map((video) => video.youtube_id)).toEqual(['VID_LOAD']);

        harness.close();
    });
});
// apply-patch-anchor - do not delete
