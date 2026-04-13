import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import {
    ProfileCatalog,
    ProfileReturnPathPolicy,
    ProfileSelectionCookieStore
} from '../../src/lib/profiles';

describe('profile helpers', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        for (const ddl of ALL_DDL) {
            db.exec(ddl);
        }
    });

    it('ensures the hard-coded profile records exist', () => {
        const profileDAO = new ProfileDAO(db);

        ProfileCatalog.ensureProfiles(profileDAO);

        const profiles = profileDAO.list().map((profile) => ({ key: profile.key, name: profile.name }));
        expect(profiles).toEqual([
            { key: 'default', name: 'Adult' },
            { key: 'child', name: 'Child' }
        ]);
    });

    it('falls back to the default profile key when the cookie is missing or invalid', () => {
        expect(new ProfileSelectionCookieStore({ get: () => undefined } as any).getActiveProfileKey()).toBe(ProfileCatalog.DEFAULT_KEY);
        expect(new ProfileSelectionCookieStore({ get: () => 'mystery' } as any).getActiveProfileKey()).toBe(ProfileCatalog.DEFAULT_KEY);
        expect(new ProfileSelectionCookieStore({ get: () => 'child' } as any).getActiveProfileKey()).toBe('child');
    });

    it('sanitizes return paths to internal routes only', () => {
        expect(ProfileReturnPathPolicy.sanitize('/viewer?groupId=1')).toBe('/viewer?groupId=1');
        expect(ProfileReturnPathPolicy.sanitize('https://example.com')).toBe('/viewer');
        expect(ProfileReturnPathPolicy.sanitize('//example.com')).toBe('/viewer');
        expect(ProfileReturnPathPolicy.sanitize('')).toBe('/viewer');
    });
});
