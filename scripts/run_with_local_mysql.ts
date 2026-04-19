#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { argv, env, exit } from 'node:process';
import { createConnection } from 'mysql2/promise';

const LOCAL_MYSQL_DATABASE_URL = 'mysql://yt_viewer:yt_viewer_dev@localhost:3306/yt_viewer';

function usage(): never
{
    console.log(`
Usage:
  run_with_local_mysql <command> [args...]

Runs a command with DATABASE_URL defaulting to the Docker Compose MySQL/MariaDB service.
Existing DATABASE_URL values are preserved.
`);
    exit(1);
}

async function assertMySqlReachable(databaseUrl: string): Promise<void>
{
    let connection: Awaited<ReturnType<typeof createConnection>> | null = null;

    try {
        connection = await createConnection(databaseUrl);
        await connection.query('SELECT 1');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Local MySQL/MariaDB is not reachable through DATABASE_URL.');
        console.error('Run npm run db:compose:up and wait for the database service to become healthy.');
        console.error(`Connection error: ${message}`);
        exit(1);
    } finally {
        await connection?.end().catch(() => undefined);
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
        DATABASE_URL: env.DATABASE_URL || LOCAL_MYSQL_DATABASE_URL
    };

    await assertMySqlReachable(childEnv.DATABASE_URL);

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
// apply-patch-anchor - do not delete
