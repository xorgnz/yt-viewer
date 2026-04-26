import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseMode } from '../../src/lib/daos/shared/DatabaseMode';
import { DatabasePool } from '../../src/lib/daos/shared/DatabasePool';
import { ServerDatabaseContext } from '../../src/lib/server/ServerDatabaseContext';

type MockPoolState = {
    end: () => Promise<void>;
    execute: () => Promise<Array<Array<{ value: number }>>>;
    getConnection: () => Promise<{ release: () => void }>;
    release: () => void;
};

const hoisted = vi.hoisted(() => {
    return {
        poolStates: [] as MockPoolState[]
    };
});

vi.mock('mysql2/promise', () => {
    class MockPool
    {
        readonly state: MockPoolState;

        constructor()
        {
            this.state = {
                end: vi.fn(async () => {}),
                execute: vi.fn(async () => {
                    return [[{ value: 1 }]];
                }),
                getConnection: vi.fn(async () => {
                    return { release: this.state.release };
                }),
                release: vi.fn()
            };

            hoisted.poolStates.push(this.state);
        }

        end(): Promise<void>
        {
            return this.state.end();
        }

        execute(): Promise<Array<Array<{ value: number }>>>
        {
            return this.state.execute();
        }

        getConnection(): Promise<{ release: () => void }>
        {
            return this.state.getConnection();
        }
    }

    return {
        createPool: () => new MockPool()
    };
});

describe('ServerDatabaseContext', () => {
    let previousNodeEnv: string | undefined;
    let previousDatabaseUrl: string | undefined;

    beforeEach(() => {
        previousNodeEnv = process.env.NODE_ENV;
        previousDatabaseUrl = process.env.DATABASE_URL;
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_URL = 'mysql://example-user:secret@localhost:3306/yt_viewer';
        hoisted.poolStates.length = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();

        if (previousNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = previousNodeEnv;
        }

        if (previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousDatabaseUrl;
        }
    });

    it('maps node environments to repository database modes', () => {
        expect(ServerDatabaseContext.resolveMode('test')).toBe(DatabaseMode.Test);
        expect(ServerDatabaseContext.resolveMode('production')).toBe(DatabaseMode.Live);
        expect(ServerDatabaseContext.resolveMode('development')).toBe(DatabaseMode.Dev);
        expect(ServerDatabaseContext.resolveMode('staging')).toBe(DatabaseMode.Dev);
        expect(ServerDatabaseContext.resolveMode('TEST')).toBe(DatabaseMode.Test);
    });

    it('opens a database context for the resolved mode', async () => {
        const context = ServerDatabaseContext.open();

        try {
            const result = await context.db.query<{ value: number }>('SELECT 1 AS value');

            expect(context.mode).toBe(DatabaseMode.Test);
            expect(result.rows[0].value).toBe(1);
            expect(context.db.instance).not.toBeNull();
        } finally {
            await context.close();
        }
    });

    it('requires DATABASE_URL for non-test runtime modes', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.DATABASE_URL;

        expect(() => ServerDatabaseContext.open('development', '')).toThrow('Server runtime database access requires DATABASE_URL to be set.');
    });

    it('closes the wrapper after successful and failed work', async () => {
        const successfulWrappers: Array<Pick<DatabasePool, 'instance'>> = [];
        const failingWrappers: Array<Pick<DatabasePool, 'instance'>> = [];

        await expect(ServerDatabaseContext.run(async ({ db }) => {
            successfulWrappers.push(db);

            const result = await db.query<{ value: number }>('SELECT 1 AS value');
            expect(result.rows[0].value).toBe(1);

            return 42;
        })).resolves.toBe(42);

        expect(successfulWrappers).toHaveLength(1);
        expect(successfulWrappers[0].instance).toBeNull();

        await expect(ServerDatabaseContext.run(({ db }) => {
            failingWrappers.push(db);
            throw new Error('request failed');
        })).rejects.toThrow('request failed');

        expect(failingWrappers).toHaveLength(1);
        expect(failingWrappers[0].instance).toBeNull();
    });

    it('surfaces a clear error when DATABASE_URL is unreachable', async () => {
        hoisted.poolStates.length = 0;
        process.env.NODE_ENV = 'development';

        vi.spyOn(DatabasePool.prototype, 'verifyConnection').mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:3306'));

        await expect(ServerDatabaseContext.run(async () => {
            return 42;
        })).rejects.toMatchObject({
            status: 503,
            body: {
                message: 'Unable to reach database. Check the configured DATABASE_URL and confirm the runtime database is reachable. Remember to run npm run db:compose:up and wait for the database service to become healthy. Connection error: connect ECONNREFUSED 127.0.0.1:3306'
            }
        });
    });

    it('uses deployment guidance for unreachable production databases', async () => {
        hoisted.poolStates.length = 0;
        process.env.NODE_ENV = 'production';

        vi.spyOn(DatabasePool.prototype, 'verifyConnection').mockRejectedValueOnce(new Error('Access denied for user'));

        await expect(ServerDatabaseContext.run(async () => {
            return 42;
        })).rejects.toMatchObject({
            status: 503,
            body: {
                message: 'Unable to reach database. Please contact an administrator Connection error: Access denied for user'
            }
        });
    });
});
// apply-patch-anchor - do not delete
