import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';

type MockPoolState = {
    connect: any;
    end: any;
    query: any;
    release: any;
};

const hoisted = vi.hoisted(() => {
    return {
        poolStates: [] as MockPoolState[]
    };
});

vi.mock('pg', () => {
    class MockPool
    {
        readonly state: MockPoolState;

        constructor()
        {
            const release = vi.fn();
            this.state = {
                connect: vi.fn(async () => {
                    return { release };
                }),
                end: vi.fn(async () => {}),
                query: vi.fn(async () => {
                    return { rows: [{ value: 1 }] };
                }),
                release
            };

            hoisted.poolStates.push(this.state);
        }

        connect(): Promise<{ release: () => void }>
        {
            return this.state.connect();
        }

        end(): Promise<void>
        {
            return this.state.end();
        }

        query(text: string, values?: unknown[]): Promise<{ rows: Array<{ value: number }> }>
        {
            return this.state.query(text, values);
        }
    }

    return {
        Pool: MockPool
    };
});

describe('PostgresPoolWrapper', () => {
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
        const wrapper = new PostgresPoolWrapper();

        expect(() => wrapper.open()).toThrow('Postgres pool requires DATABASE_URL to be set.');
    });

    it('creates a single pool instance and reuses it', async () => {
        process.env.DATABASE_URL = 'postgres://example-user:secret@localhost:5432/yt_viewer';
        const wrapper = new PostgresPoolWrapper();

        const firstPool = wrapper.open();
        const secondPool = wrapper.open();
        const queryResult = await wrapper.query('SELECT 1');

        expect(firstPool).toBe(secondPool);
        expect(hoisted.poolStates.length).toBe(1);
        expect(queryResult.rows[0].value).toBe(1);
    });

    it('releases clients after work succeeds and fails', async () => {
        process.env.DATABASE_URL = 'postgres://example-user:secret@localhost:5432/yt_viewer';
        const wrapper = new PostgresPoolWrapper();

        await wrapper.withClient(async () => {
            return 42;
        });

        await expect(wrapper.withClient(async () => {
            throw new Error('boom');
        })).rejects.toThrow('boom');

        expect(hoisted.poolStates.length).toBe(1);
        expect(hoisted.poolStates[0].release).toHaveBeenCalledTimes(2);
    });

    it('ends the current pool and clears cached state on close', async () => {
        process.env.DATABASE_URL = 'postgres://example-user:secret@localhost:5432/yt_viewer';
        const wrapper = new PostgresPoolWrapper();
        wrapper.open();

        await wrapper.close();

        expect(hoisted.poolStates.length).toBe(1);
        expect(hoisted.poolStates[0].end).toHaveBeenCalledTimes(1);
        expect(wrapper.instance).toBeNull();
    });
});
// apply-patch-anchor - do not delete