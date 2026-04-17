import { afterEach, describe, expect, it } from 'vitest';
import { requireDatabaseUrlForRuntime } from '../../src/lib/server/RuntimeDatabaseUrl';

describe('requireDatabaseUrlForRuntime', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDatabaseUrl = process.env.DATABASE_URL;

    afterEach(() => {
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

    it('throws when DATABASE_URL is missing outside test mode', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.DATABASE_URL;

        expect(() => requireDatabaseUrlForRuntime('runtime')).toThrow('runtime requires DATABASE_URL to be set.');
    });

    it('allows missing DATABASE_URL in test mode by default', () => {
        process.env.NODE_ENV = 'test';
        delete process.env.DATABASE_URL;

        expect(requireDatabaseUrlForRuntime('runtime')).toBe('');
    });
});
