#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DatabaseFileLayout, DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';
import {
    DatabaseMigrationWorkflow,
    type DatabaseMigrationWorkflowOptions,
    type DatabaseMigrationWorkflowResult
} from '$lib/daos/shared/DatabaseMigrationWorkflow';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

type ModeArg = DatabaseMode;

function parseArgs(): { mode: ModeArg }
{
    const args = argv.slice(2);
    let modeStr: string | undefined;
    const extraPositionals: string[] = [];

    // Parse the supported mode argument and reject unsupported target selectors.
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

    if (!modeStr) usage('Missing mode.');
    if (extraPositionals.length > 0) {
        usage(`Unexpected extra argument: ${extraPositionals[0]}`);
    }

    const normalized = String(modeStr).toLowerCase();
    switch (normalized) {
        case 'dev': return { mode: DatabaseMode.Dev };
        case 'live': return { mode: DatabaseMode.Live };
        case 'test': usage('Migration is only supported for dev and live databases.');
        default: usage(`Unknown mode: ${modeStr}`);
    }
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <dev|live>\n  ${script} <dev|live>\n\nRuns the explicit forward-only migration workflow for an existing database.\n- Use this command for in-place upgrades only; it does not create fresh databases.\n- Only dev and live databases are supported by this command.\n- Test databases should continue using create_database for fresh setup.\n- The command upgrades only to the latest supported version known to the app.\n`;
    if (error) console.error(`Error: ${error}\n`);
    console.log(message);
    exit(error ? 1 : 0);
}

export function runMigrationWorkflow(options: DatabaseMigrationWorkflowOptions): DatabaseMigrationWorkflowResult
{
    return new DatabaseMigrationWorkflow().run(options);
}

async function main()
{
    const { mode } = parseArgs();

    requireDatabaseUrlForRuntime('Database migrate script');

    const dbPath = new DatabaseFileLayout().resolveDatabasePath(mode);

    try {
        const workflowResult = runMigrationWorkflow({ dbPath });
        const result = workflowResult.migrationResult;

        // Report the discovered state and the upgrade result in a consistent format.
        console.log(`Database path: ${dbPath}`);
        console.log(`Backup created: ${workflowResult.backupPath}`);
        console.log(`Detected version: ${result.currentVersion}`);
        console.log(`Target version: ${result.targetVersion}`);

        if (result.appliedMigrations.length === 0) {
            console.log('Applied migrations: none');
            console.log(`Final version: ${result.finalVersion}`);
            return;
        }

        console.log(`Applied migrations: ${result.appliedMigrations.map((migration) => `${migration.version}:${migration.name}`).join(', ')}`);
        console.log(`Final version: ${result.finalVersion}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.startsWith('Database file not found at:')) {
            throw new Error(`${message} Create it first with: npm run create_database -- ${mode}`);
        }

        throw new Error(message);
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
