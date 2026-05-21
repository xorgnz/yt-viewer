import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type SettingsRouteModule = typeof import('../../src/routes/settings/+page.server');

const fakeDb = {};
const runMock = vi.fn(async (work: (context: { db: typeof fakeDb }) => unknown) => await work({ db: fakeDb }));
const resolveMock = vi.fn();
const profileDAOState = {
    activeProfile: {
        id: 'default',
        key: 'default',
        name: 'Adult',
        splitTimerModeEnabled: true,
        toFields() {
            return {
                id: this.id,
                key: this.key,
                name: this.name,
                splitTimerModeEnabled: this.splitTimerModeEnabled
            };
        }
    },
    updateSplitTimerModeEnabled: vi.fn(async (_key: string, enabled: boolean) => {
        profileDAOState.activeProfile.splitTimerModeEnabled = enabled;
    }),
    getByKey: vi.fn(async () => profileDAOState.activeProfile)
};

vi.mock('$lib/server/ServerDatabaseContext', () => ({
    ServerDatabaseContext: {
        run: runMock
    }
}));

vi.mock('$lib/server/ServerProfileContext', () => ({
    ServerProfileContext: {
        resolve: resolveMock
    }
}));

vi.mock('$lib/daos/profileDAO', () => ({
    ProfileDAO: class
    {
        updateSplitTimerModeEnabled = profileDAOState.updateSplitTimerModeEnabled;
        getByKey = profileDAOState.getByKey;
    }
}));

describe('settings page route', () => {
    let routeModule: SettingsRouteModule;

    beforeAll(async () => {
        routeModule = await import('../../src/routes/settings/+page.server');
    });

    beforeEach(() => {
        runMock.mockClear();
        resolveMock.mockReset();
        profileDAOState.updateSplitTimerModeEnabled.mockClear();
        profileDAOState.getByKey.mockClear();
        profileDAOState.activeProfile.splitTimerModeEnabled = true;
        resolveMock.mockResolvedValue({
            activeProfile: profileDAOState.activeProfile,
            activeProfileKey: 'default'
        });
    });

    it('loads the active profile timer display setting', async () => {
        const result = await routeModule.load({ cookies: {} } as never);

        expect(result.activeProfile).toEqual({
            id: 'default',
            key: 'default',
            name: 'Adult',
            splitTimerModeEnabled: true
        });
    });

    it('updates the active profile split-timer setting', async () => {
        const form = new FormData();
        form.set('splitTimerModeEnabled', '0');

        const result = await routeModule.actions.saveSplitTimerMode({
            request: new Request('http://localhost/settings', {
                method: 'POST',
                body: form
            }),
            cookies: {}
        } as never);

        expect(profileDAOState.updateSplitTimerModeEnabled).toHaveBeenCalledWith('default', false);
        expect(result).toEqual({
            ok: true,
            activeProfile: {
                id: 'default',
                key: 'default',
                name: 'Adult',
                splitTimerModeEnabled: false
            },
            message: 'Settings updated.'
        });
    });
});
