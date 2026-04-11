#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { MigrationRunner } from '$lib/daos/shared/MigrationRunner';
import { SqliteMigrationAdapter } from '$lib/daos/shared/SqliteMigrationAdapter';
import type { MigrationDefinition } from '$lib/daos/migrations/migrationTypes';

type ModeArg = DatabaseMode;

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
        } else if (!a.startsWith('-') && !modeStr) {
            modeStr = a;
        }
    }

    if (!modeStr) usage('Missing mode.');
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
    const message = `\nUsage:\n  ${script} --mode <dev|live>\n  ${script} <dev|live>\n\nRuns the explicit forward-only migration workflow for an existing database.\n- Only dev and live databases are supported by this command.\n- Test databases should continue using create_database for fresh setup.\n- The command upgrades only to the latest supported version known to the app.\n`;
    if (error) console.error(`Error: ${error}\n`);
    console.log(message);
    exit(error ? 1 : 0);
}

function resolveDbPath(mode: ModeArg): { dbPath: string }
{
    const baseDir = process.env.YTCW_DB_DIR || '.data';
    const defaults = { test: 'test.db', dev: 'dev.db', live: process.env.YTCW_DB_FILE || 'app.db' } as const;
    const file = mode === 'test' ? defaults.test : mode === 'dev' ? defaults.dev : defaults.live;
    const dbPath = path.resolve(process.cwd(), baseDir, file);
    return { dbPath };
}

async function main()
{
    const { mode } = parseArgs();
    const { dbPath } = resolveDbPath(mode);

    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}. Create it first with: npm run create_database -- ${mode}`);
    }

    const db = new Database(dbPath);
    try {
        // Keep migration selection explicit until the first migration registry lands.
        const migrations: MigrationDefinition[] = [];
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), migrations);
        const result = runner.runToLatest();

        if (result.appliedMigrations.length === 0) {
            console.log(`Database is already at the latest supported version: ${result.finalVersion}`);
            return;
        }

        console.log(`Migrated database from version ${result.currentVersion} to version ${result.finalVersion}`);
    } finally {
        db.close();
    }
}

main().catch((err) => {
    console.error('Database migration failed:', err?.message || err);
    exit(1);
});
