import {
    Pool,
    type PoolClient,
    type PoolConfig,
    type QueryResult,
    type QueryResultRow
} from 'pg';

type PostgresPoolWrapperOptions = {
    connectionString?: string;
    poolConfig?: Omit<PoolConfig, 'connectionString'>;
};

export class PostgresPoolWrapper
{
    private readonly connectionString: string;
    private readonly poolConfig: Omit<PoolConfig, 'connectionString'> | undefined;
    private pool: Pool | null = null;

    constructor(options?: PostgresPoolWrapperOptions)
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
            throw new Error('Postgres pool requires DATABASE_URL to be set.');
        }

        this.pool = new Pool({
            ...this.poolConfig,
            connectionString: this.connectionString
        });

        return this.pool;
    }

    async withClient<T>(work: (client: PoolClient) => Promise<T> | T): Promise<T>
    {
        const client = await this.open().connect();

        try {
            return await work(client);
        } finally {
            client.release();
        }
    }

    async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>
    {
        return this.open().query<T>(text, values);
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
}
// apply-patch-anchor - do not delete