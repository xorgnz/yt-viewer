#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MIGRATIONS } from '$lib/daos/migrations/registry';
import type { MigrationDefinition, MigrationRunResult } from '$lib/daos/migrations/migrationTypes';
import { DatabaseMode } from '$lib/daos/shared/DatabaseMode';
import { MigrationRunner } from '$lib/daos/shared/MigrationRunner';
import { DatabaseMigrationAdapter } from '$lib/daos/shared/MigrationAdapter';
import { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

type ModeArg = DatabaseMode.Dev | DatabaseMode.Live;
type DatabaseClientProvider = Pick<DatabasePool, 'query'>;

function parseArgs(): { mode: ModeArg }
{
    const args = argv.slice(2);
    let modeStr: string | undefined;
    const extraPositionals: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a.startsWith('--mode=')) {
            modeStr = a.split('=')[1];
        } else if (a === '--mode' || a === '-m') {
            modeStr = args[i + 1];
            i += 1;
        } else if (a.startsWith('--target=') || a.startsWith('--to=')) {
            usage('Target versions are not supported. This command always migrates to the latest supported version.');
        } else if (a === '--target' || a === '--to' || a === '-t') {
            usage('Target versions are not supported. This command always migrates to the latest supported version.');
        } else if (!a.startsWith('-') && !modeStr) {
            modeStr = a;
        } else if (!a.startsWith('-')) {
            extraPositionals.push(a);
        } else {
            usage(`Unknown argument: ${a}`);
        }
    }

    if (!modeStr) {
        usage('Missing mode.');
    }

    if (extraPositionals.length > 0) {
        usage(`Unexpected extra argument: ${extraPositionals[0]}`);
    }

    const normalized = String(modeStr).toLowerCase();

    switch (normalized) {
        case 'dev': return { mode: DatabaseMode.Dev };
        case 'live': return { mode: DatabaseMode.Live };
        case 'test': usage('Migration is only supported for dev and live MySQL/MariaDB databases.');
        default: usage(`Unknown mode: ${modeStr}`);
    }
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <dev|live>\n  ${script} <dev|live>\n\nRuns explicit forward-only MySQL/MariaDB migrations for the configured DATABASE_URL.\n- This command only applies registered forward migrations.\n- Only dev and live databases are supported by this command.\n- The target MySQL/MariaDB database must already exist and contain schema metadata.\n- The command upgrades only to the latest supported version known to the app.\n`;

    if (error) {
        console.error(`Error: ${error}\n`);
    }

    console.log(message);
    exit(error ? 1 : 0);
}

export async function runMigrationWorkflow(options: {
    pool: DatabaseClientProvider;
    migrations?: MigrationDefinition[];
}): Promise<MigrationRunResult>
{
    const runner = new MigrationRunner(
        new DatabaseMigrationAdapter(options.pool),
        options.migrations || MIGRATIONS
    );

    return runner.runToLatest();
}

async function main(): Promise<void>
{
    const { mode } = parseArgs();
    const databaseUrl = requireDatabaseUrlForRuntime('Database migrate script', {
        allowMissingInTest: false,
    });
    const pool = new DatabasePool({ connectionString: databaseUrl });

    try {
        const result = await runMigrationWorkflow({ pool });

        console.log(`Database mode: ${mode}`);
        console.log('Database target: DATABASE_URL');
        console.log(`Detected version: ${result.currentVersion}`);
        console.log(`Target version: ${result.targetVersion}`);

        if (result.appliedMigrations.length === 0) {
            console.log('Applied migrations: none');
            console.log(`Final version: ${result.finalVersion}`);
            return;
        }

        console.log(`Applied migrations: ${result.appliedMigrations.map((migration) => `${migration.version}:${migration.name}`).join(', ')}`);
        console.log(`Final version: ${result.finalVersion}`);
    } finally {
        await pool.close();
    }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const scriptPath = fileURLToPath(import.meta.url);

if (entryPath === scriptPath) {
    main().catch((err) => {
        console.error('Database migration failed:', err?.message || err);
        exit(1);
    });
}
