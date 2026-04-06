import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_DDL } from '../../src/lib/daos/_schema';
import { ProfileDAO } from '../../src/lib/daos/profileDAO';
import {
    DEFAULT_PROFILE_KEY,
    ensureProfiles,
    getActiveProfileKey,
    sanitizeReturnTo
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

        ensureProfiles(profileDAO);

        const profiles = profileDAO.list().map((profile) => ({ key: profile.key, name: profile.name }));
        expect(profiles).toEqual([
            { key: 'default', name: 'Adult' },
            { key: 'child', name: 'Child' }
        ]);
    });

    it('falls back to the default profile key when the cookie is missing or invalid', () => {
        expect(getActiveProfileKey({ get: () => undefined } as any)).toBe(DEFAULT_PROFILE_KEY);
        expect(getActiveProfileKey({ get: () => 'mystery' } as any)).toBe(DEFAULT_PROFILE_KEY);
        expect(getActiveProfileKey({ get: () => 'child' } as any)).toBe('child');
    });

    it('sanitizes return paths to internal routes only', () => {
        expect(sanitizeReturnTo('/viewer?groupId=1')).toBe('/viewer?groupId=1');
        expect(sanitizeReturnTo('https://example.com')).toBe('/viewer');
        expect(sanitizeReturnTo('//example.com')).toBe('/viewer');
        expect(sanitizeReturnTo('')).toBe('/viewer');
    });
});
