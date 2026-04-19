import { DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';
import { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

export { DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';

export class ServerDatabaseContext
{
    readonly mode: DatabaseMode;
    readonly db: PostgresPoolWrapper;

    private constructor(mode: DatabaseMode, db: PostgresPoolWrapper)
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

    static open(nodeEnv: string | undefined = process.env.NODE_ENV): ServerDatabaseContext
    {
        const mode = ServerDatabaseContext.resolveMode(nodeEnv);
        const databaseUrl = requireDatabaseUrlForRuntime('Server runtime database access', {
            nodeEnv,
            allowMissingInTest: false,
        });
        const db = new PostgresPoolWrapper({ connectionString: databaseUrl });

        db.open();

        return new ServerDatabaseContext(mode, db);
    }

    static async run<T>(
        work: (context: ServerDatabaseContext) => Promise<T> | T,
        nodeEnv: string | undefined = process.env.NODE_ENV
    ): Promise<T>
    {
        const context = ServerDatabaseContext.open(nodeEnv);

        try {
            return await work(context);
        } finally {
            await context.close();
        }
    }

    async close(): Promise<void>
    {
        await this.db.close();
    }
}
// apply-patch-anchor - do not delete