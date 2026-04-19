import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import { ServerProfileContext } from '../../src/lib/server/ServerProfileContext';

describe('ServerProfileContext', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }
    });

    it('ensures profiles exist and resolves the requested active profile', () => {
        const profileDAO = new ProfileDAO(db);

        const profileContext = ServerProfileContext.resolve(profileDAO, {
            get: () => 'child'
        } as any);

        expect(profileContext.requestedProfileKey).toBe('child');
        expect(profileContext.activeProfileKey).toBe('child');
        expect(profileContext.activeProfileName).toBe('Child');
        expect(profileDAO.list().map((profile) => profile.key)).toEqual(['default', 'child']);
    });

    it('falls back to the default profile when the cookie value is invalid', () => {
        const profileContext = ServerProfileContext.resolve(new ProfileDAO(db), {
            get: () => 'mystery'
        } as any);

        expect(profileContext.requestedProfileKey).toBe('default');
        expect(profileContext.activeProfileKey).toBe('default');
        expect(profileContext.activeProfileName).toBe('Adult');
    });
});
// apply-patch-anchor - do not delete