import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';
import { ServerProfileContext } from '../../src/lib/server/ServerProfileContext';
import { ViewerVirtualChannelService } from '../../src/lib/server/viewer/ViewerVirtualChannelService';

describe('ViewerVirtualChannelService', () => {
    it('loads viewer virtual-channel navigation with the active profile key', async () => {
        const db = new Database(':memory:');
        applyLatestSchemaBootstrap(db);

        const profileDAO = new ProfileDAO(db);
        const virtualChannelDAO = new VirtualChannelDAO(db);

        profileDAO.upsertByKey('default', 'Adult');
        virtualChannelDAO.create('Beta Group');
        virtualChannelDAO.create('Alpha Group');

        const profileContext = ServerProfileContext.resolve(profileDAO, {
            get() {
                return 'default';
            }
        } as any);
        const service = new ViewerVirtualChannelService(virtualChannelDAO, profileContext);

        const result = await service.loadNavigation();

        expect(result.profileKey).toBe('default');
        expect(result.groups.map((group) => group.name)).toEqual([
            'Alpha Group',
            'Beta Group'
        ]);

        db.close();
    });
});
// apply-patch-anchor - do not delete