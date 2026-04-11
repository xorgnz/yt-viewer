import type Database from 'better-sqlite3';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';

export class ServerDatabaseContext
{
    readonly mode: DatabaseMode;
    readonly wrapper: DatabaseWrapper;
    readonly db: Database.Database;

    private constructor(mode: DatabaseMode, wrapper: DatabaseWrapper, db: Database.Database)
    {
        this.mode = mode;
        this.wrapper = wrapper;
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
        const wrapper = new DatabaseWrapper(mode);
        const db = wrapper.open();

        return new ServerDatabaseContext(mode, wrapper, db);
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
            context.close();
        }
    }

    close(): void
    {
        this.wrapper.close();
    }
}
