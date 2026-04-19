#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { argv, env, exit } from 'node:process';
import { Client } from 'pg';

const LOCAL_POSTGRES_DATABASE_URL = 'postgres://yt_viewer:yt_viewer_dev@localhost:5432/yt_viewer?sslmode=disable';

function usage(): never
{
    console.log(`
Usage:
  run_with_local_postgres <command> [args...]

Runs a command with DATABASE_URL defaulting to the Docker Compose Postgres service.
Existing DATABASE_URL values are preserved.
`);
    exit(1);
}

async function assertPostgresReachable(databaseUrl: string): Promise<void>
{
    const client = new Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000
    });

    try {
        await client.connect();
        await client.query('SELECT 1');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Local Postgres is not reachable through DATABASE_URL.');
        console.error('Run npm run db:compose:up and wait for the postgres service to become healthy.');
        console.error(`Connection error: ${message}`);
        exit(1);
    } finally {
        await client.end().catch(() => undefined);
    }
}

async function main(): Promise<void>
{
    const command = argv[2];
    const args = argv.slice(3);

    if (!command) {
        usage();
    }

    const childEnv = {
        ...env,
        DATABASE_URL: env.DATABASE_URL || LOCAL_POSTGRES_DATABASE_URL
    };

    await assertPostgresReachable(childEnv.DATABASE_URL);

    const child = spawn(command, args, {
        env: childEnv,
        shell: true,
        stdio: 'inherit'
    });

    child.on('exit', (code) => {
        exit(code ?? 1);
    });
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
});
