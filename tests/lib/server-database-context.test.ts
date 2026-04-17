import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { DatabaseMode, DatabaseWrapper } from '../../src/lib/daos/shared/DatabaseWrapper';
import { ServerDatabaseContext } from '../../src/lib/server/ServerDatabaseContext';

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

    it('opens a database context for the resolved mode', () => {
        const context = ServerDatabaseContext.open();

        try {
            const row = context.db.prepare('SELECT 1 AS value').get() as { value: number };

            expect(context.mode).toBe(DatabaseMode.Test);
            expect(path.basename(context.wrapper.path)).toBe('test.db');
            expect(row.value).toBe(1);
            expect(context.wrapper.instance).not.toBeNull();
        } finally {
            context.close();
        }
    });

    it('requires DATABASE_URL for non-test runtime modes', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.DATABASE_URL;

        expect(() => ServerDatabaseContext.open('development')).toThrow('Server runtime database access requires DATABASE_URL to be set.');
    });

    it('closes the wrapper after successful and failed work', async () => {
        let successfulWrapper: Pick<DatabaseWrapper, 'instance'> | null = null;
        let failingWrapper: Pick<DatabaseWrapper, 'instance'> | null = null;

        await expect(ServerDatabaseContext.run(({ wrapper, db }) => {
            successfulWrapper = wrapper;

            const row = db.prepare('SELECT 1 AS value').get() as { value: number };
            expect(row.value).toBe(1);

            return 42;
        })).resolves.toBe(42);

        expect(successfulWrapper).not.toBeNull();
        expect((successfulWrapper as any).instance).toBeNull();

        await expect(ServerDatabaseContext.run(({ wrapper }) => {
            failingWrapper = wrapper;
            throw new Error('request failed');
        })).rejects.toThrow('request failed');

        expect(failingWrapper).not.toBeNull();
        expect((failingWrapper as any).instance).toBeNull();
    });
});
