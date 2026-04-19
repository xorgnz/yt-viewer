#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SCHEMA_VERSION } from '$lib/daos/_schema';
import { DatabaseMode } from '$lib/daos/shared/DatabaseMode';
import { MySqlLatestSchemaBootstrapper } from '$lib/daos/shared/LatestSchemaBootstrap';
import { MySqlPoolWrapper } from '$lib/daos/shared/MySqlPoolWrapper';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

type ModeArg = DatabaseMode;
type MySqlClientProvider = Pick<MySqlPoolWrapper, 'query'>;

function parseArgs(): { mode: ModeArg }
{
    const args = argv.slice(2);
    let modeStr: string | undefined;

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a.startsWith('--mode=')) {
            modeStr = a.split('=')[1];
        } else if (a === '--mode' || a === '-m') {
            modeStr = args[i + 1];
            i += 1;
        } else if (a === '--reset' || a === '--force') {
            usage('Resetting MySQL/MariaDB data is not supported by this setup command.');
        } else if (!a.startsWith('-') && !modeStr) {
            modeStr = a;
        } else {
            usage(`Unknown argument: ${a}`);
        }
    }

    if (!modeStr) {
        usage('Missing mode.');
    }

    const normalized = String(modeStr).toLowerCase();

    switch (normalized) {
        case 'test': return { mode: DatabaseMode.Test };
        case 'dev': return { mode: DatabaseMode.Dev };
        case 'live': return { mode: DatabaseMode.Live };
        default: usage(`Unknown mode: ${modeStr}`);
    }
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <test|dev|live>\n  ${script} <test|dev|live>\n\nCreates or validates the MySQL/MariaDB schema for the configured DATABASE_URL using the latest schema bootstrap (v${SCHEMA_VERSION}).\n- This command does not create, delete, or reset SQLite files.\n- The target MySQL/MariaDB database must already exist and be reachable through DATABASE_URL.\n- The schema bootstrap is idempotent and records the latest schema version.\n`;

    if (error) {
        console.error(`Error: ${error}\n`);
    }

    console.log(message);
    exit(error ? 1 : 0);
}

export async function runCreateDatabaseWorkflow(options: {
    pool: MySqlClientProvider;
}): Promise<void>
{
    await new MySqlLatestSchemaBootstrapper().apply(options.pool);
}

async function main(): Promise<void>
{
    const { mode } = parseArgs();
    const databaseUrl = requireDatabaseUrlForRuntime('Database create script', {
        allowMissingInTest: false,
    });
    const pool = new MySqlPoolWrapper({ connectionString: databaseUrl });

    try {
        await runCreateDatabaseWorkflow({ pool });
        console.log(`MySQL/MariaDB schema is ready for mode="${mode}" at DATABASE_URL.`);
    } finally {
        await pool.close();
    }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const scriptPath = fileURLToPath(import.meta.url);

if (entryPath === scriptPath) {
    main().catch((err) => {
        console.error('Failed to create database:', err?.message || err);
        exit(1);
    });
}
