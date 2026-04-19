#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { argv, env, exit } from 'node:process';

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

const command = argv[2];
const args = argv.slice(3);

if (!command) {
    usage();
}

const child = spawn(command, args, {
    env: {
        ...env,
        DATABASE_URL: env.DATABASE_URL || LOCAL_POSTGRES_DATABASE_URL
    },
    shell: true,
    stdio: 'inherit'
});

child.on('exit', (code) => {
    exit(code ?? 1);
});
