import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { DatabaseMode } from '../../src/lib/daos/shared/DatabaseWrapper';
import type { PostgresPoolWrapper } from '../../src/lib/daos/shared/PostgresPoolWrapper';
import { ServerDatabaseContext } from '../../src/lib/server/ServerDatabaseContext';

type MockPoolState = {
    end: () => Promise<void>;
    query: () => Promise<{ rows: Array<{ value: number }> }>;
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
            this.state = {
                end: vi.fn(async () => {}),
                query: vi.fn(async () => {
                    return { rows: [{ value: 1 }] };
                })
            };

            hoisted.poolStates.push(this.state);
        }

        end(): Promise<void>
        {
            return this.state.end();
        }

        query(): Promise<{ rows: Array<{ value: number }> }>
        {
            return this.state.query();
        }
    }

    return {
        Pool: MockPool
    };
});

describe('ServerDatabaseContext', () => {
    let tempDir: string;
    let previousNodeEnv: string | undefined;
    let previousDbDir: string | undefined;
    let previousDatabaseUrl: string | undefined;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytcw-request-db-'));
        previousNodeEnv = process.env.NODE_ENV;
        previousDbDir = process.env.YTCW_DB_DIR;
        previousDatabaseUrl = process.env.DATABASE_URL;
        process.env.NODE_ENV = 'test';
        process.env.YTCW_DB_DIR = tempDir;
        process.env.DATABASE_URL = 'postgres://example-user:secret@localhost:5432/yt_viewer';
        hoisted.poolStates.length = 0;

        const db = new Database(path.join(tempDir, 'test.db'));
        applyLatestSchemaBootstrap(db);
        db.close();
    });

    afterEach(() => {
        if (previousNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = previousNodeEnv;
        }

        if (previousDbDir === undefined) {
            delete process.env.YTCW_DB_DIR;
        } else {
            process.env.YTCW_DB_DIR = previousDbDir;
        }

        if (previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousDatabaseUrl;
        }

        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
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

        expect(() => ServerDatabaseContext.open('development')).toThrow('Server runtime database access requires DATABASE_URL to be set.');
    });

    it('closes the wrapper after successful and failed work', async () => {
        const successfulWrappers: Array<Pick<PostgresPoolWrapper, 'instance'>> = [];
        const failingWrappers: Array<Pick<PostgresPoolWrapper, 'instance'>> = [];

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
});
