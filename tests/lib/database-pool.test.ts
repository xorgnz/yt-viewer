import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabasePool } from '$lib/daos/shared/DatabasePool';

type MockPoolState = {
    end: any;
    execute: any;
    getConnection: any;
    release: any;
};

const hoisted = vi.hoisted(() => {
    return {
        poolStates: [] as MockPoolState[]
    };
});

vi.mock('mysql2/promise', () => {
    function createPool()
    {
        const release = vi.fn();
        const state = {
            end: vi.fn(async () => {}),
            execute: vi.fn(async () => {
                return [[{ value: 1 }], []];
            }),
            getConnection: vi.fn(async () => {
                return { release };
            }),
            release
        };

        hoisted.poolStates.push(state);

        return {
            end: state.end,
            execute: state.execute,
            getConnection: state.getConnection
        };
    }

    return { createPool };
});

describe('DatabasePool', () => {
    let previousDatabaseUrl: string | undefined;

    beforeEach(() => {
        previousDatabaseUrl = process.env.DATABASE_URL;
        hoisted.poolStates.length = 0;
    });

    afterEach(() => {
        if (previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousDatabaseUrl;
        }
    });

    it('throws when no connection string is available', () => {
        delete process.env.DATABASE_URL;
        const wrapper = new DatabasePool();

        expect(() => wrapper.open()).toThrow('MySQL pool requires DATABASE_URL to be set.');
    });

    it('creates a single pool instance and reuses it', async () => {
        process.env.DATABASE_URL = 'mysql://example-user:secret@localhost:3306/yt_viewer';
        const wrapper = new DatabasePool();

        const firstPool = wrapper.open();
        const secondPool = wrapper.open();
        const queryResult = await wrapper.query('SELECT 1');

        expect(firstPool).toBe(secondPool);
        expect(hoisted.poolStates.length).toBe(1);
        expect(queryResult.rows[0].value).toBe(1);
    });

    it('releases connections after work succeeds and fails', async () => {
        process.env.DATABASE_URL = 'mysql://example-user:secret@localhost:3306/yt_viewer';
        const wrapper = new DatabasePool();

        await wrapper.withConnection(async () => {
            return 42;
        });

        await expect(wrapper.withConnection(async () => {
            throw new Error('boom');
        })).rejects.toThrow('boom');

        expect(hoisted.poolStates.length).toBe(1);
        expect(hoisted.poolStates[0].release).toHaveBeenCalledTimes(2);
    });

    it('verifies connectivity through a real pooled connection', async () => {
        process.env.DATABASE_URL = 'mysql://example-user:secret@localhost:3306/yt_viewer';
        const wrapper = new DatabasePool();

        await expect(wrapper.verifyConnection()).resolves.toBeUndefined();

        expect(hoisted.poolStates.length).toBe(1);
        expect(hoisted.poolStates[0].getConnection).toHaveBeenCalledTimes(1);
        expect(hoisted.poolStates[0].release).toHaveBeenCalledTimes(1);
    });

    it('ends the current pool and clears cached state on close', async () => {
        process.env.DATABASE_URL = 'mysql://example-user:secret@localhost:3306/yt_viewer';
        const wrapper = new DatabasePool();
        wrapper.open();

        await wrapper.close();

        expect(hoisted.poolStates.length).toBe(1);
        expect(hoisted.poolStates[0].end).toHaveBeenCalledTimes(1);
        expect(wrapper.instance).toBeNull();
    });
});
// apply-patch-anchor - do not delete
