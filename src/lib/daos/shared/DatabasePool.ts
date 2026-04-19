import {
    createPool,
    type Pool,
    type PoolConnection,
    type PoolOptions,
    type QueryResult
} from 'mysql2/promise';

type DatabasePoolOptions = {
    connectionString?: string;
    poolConfig?: Omit<PoolOptions, 'uri'>;
};

export type DatabaseQueryResult<T> = {
    rows: T[];
    affectedRows: number;
    insertId: number;
};

export class DatabasePool
{
    private readonly connectionString: string;
    private readonly poolConfig: Omit<PoolOptions, 'uri'> | undefined;
    private pool: Pool | null = null;

    constructor(options?: DatabasePoolOptions)
    {
        this.connectionString = options?.connectionString?.trim() || process.env.DATABASE_URL?.trim() || '';
        this.poolConfig = options?.poolConfig;
    }

    open(): Pool
    {
        if (this.pool) {
            return this.pool;
        }

        if (!this.connectionString) {
            throw new Error('MySQL pool requires DATABASE_URL to be set.');
        }

        this.pool = createPool({
            ...this.poolConfig,
            uri: this.connectionString,
            waitForConnections: true,
            connectionLimit: this.poolConfig?.connectionLimit ?? 10
        });

        return this.pool;
    }

    async withConnection<T>(work: (connection: PoolConnection) => Promise<T> | T): Promise<T>
    {
        const connection = await this.open().getConnection();

        try {
            return await work(connection);
        } finally {
            connection.release();
        }
    }

    async query<T extends object = Record<string, unknown>>(
        text: string,
        values?: unknown[]
    ): Promise<DatabaseQueryResult<T>>
    {
        const [result] = await this.open().execute<QueryResult>(text, (values || []) as never[]);
        return DatabasePool.mapResult<T>(result);
    }

    async close(): Promise<void>
    {
        if (!this.pool) {
            return;
        }

        const poolToClose = this.pool;
        this.pool = null;
        await poolToClose.end();
    }

    get instance(): Pool | null
    {
        return this.pool;
    }

    private static mapResult<T extends object>(result: QueryResult): DatabaseQueryResult<T>
    {
        if (Array.isArray(result)) {
            return {
                rows: result as T[],
                affectedRows: result.length,
                insertId: 0
            };
        }

        return {
            rows: [],
            affectedRows: result.affectedRows ?? 0,
            insertId: result.insertId ?? 0
        };
    }
}
// apply-patch-anchor - do not delete
