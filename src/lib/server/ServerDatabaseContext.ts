import { error as kitError } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { DatabaseMode } from '$lib/daos/shared/DatabaseMode';
import { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

export { DatabaseMode } from '$lib/daos/shared/DatabaseMode';

export class ServerDatabaseContext
{
    readonly mode: DatabaseMode;
    readonly db: DatabasePool;

    private constructor(mode: DatabaseMode, db: DatabasePool)
    {
        this.mode = mode;
        this.db = db;
    }

    static resolveMode(nodeEnv: string | undefined = process.env.NODE_ENV): DatabaseMode
    {
        const normalizedEnv = (nodeEnv || 'development').toLowerCase();

        if (normalizedEnv === 'test') {
            return DatabaseMode.Test;
        }

        if (normalizedEnv === 'production') {
            return DatabaseMode.Live;
        }

        return DatabaseMode.Dev;
    }

    static open(
        nodeEnv: string | undefined = process.env.NODE_ENV,
        databaseUrlOverride?: string | undefined
    ): ServerDatabaseContext
    {
        const mode = ServerDatabaseContext.resolveMode(nodeEnv);
        const databaseUrl = requireDatabaseUrlForRuntime('Server runtime database access', {
            nodeEnv,
            allowMissingInTest: false,
            databaseUrl: databaseUrlOverride ?? env.DATABASE_URL,
        });
        const db = new DatabasePool({ connectionString: databaseUrl });

        db.open();

        return new ServerDatabaseContext(mode, db);
    }

    static async run<T>(
        work: (context: ServerDatabaseContext) => Promise<T> | T,
        nodeEnv: string | undefined = process.env.NODE_ENV,
        databaseUrlOverride?: string | undefined
    ): Promise<T>
    {
        const context = ServerDatabaseContext.open(nodeEnv, databaseUrlOverride);

        try {
            await context.assertReachable();
            return await work(context);
        } finally {
            await context.close();
        }
    }

    async close(): Promise<void>
    {
        await this.db.close();
    }

    private async assertReachable(): Promise<void>
    {
        try {
            await this.db.verifyConnection();
        } catch (error) {
            throw ServerDatabaseContext.wrapConnectionError(this.mode, error);
        }
    }

    private static wrapConnectionError(mode: DatabaseMode, cause: unknown): never
    {
        const message = cause instanceof Error ? cause.message : String(cause);
        const guidance = mode === DatabaseMode.Dev
            ? 'Check the configured DATABASE_URL and confirm the runtime database is reachable. Remember to run npm run db:compose:up and wait for the database service to become healthy.'
            : 'Please contact an administrator';

        throw kitError(503, [
            'Unable to reach database.',
            guidance,
            `Connection error: ${message}`
        ].join(' '));
    }
}
// apply-patch-anchor - do not delete
