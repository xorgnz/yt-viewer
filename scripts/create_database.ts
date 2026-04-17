#!/usr/bin/env node
import {argv, exit} from 'node:process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {SCHEMA_VERSION} from '$lib/daos/_schema';
import { DatabaseFileLayout, DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';
import { LatestSchemaBootstrapper } from '$lib/daos/shared/LatestSchemaBootstrap';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

function parseArgs(): { mode: DatabaseMode; reset: boolean }
{
    // Supports: --mode=dev | --mode dev | dev (positional)
    const args = argv.slice(2);
    let modeStr: string | undefined;
    let reset = false;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--mode=')) {
            modeStr = a.split('=')[1];
        } else if (a === '--mode' || a === '-m') {
            modeStr = args[i + 1];
            i += 1;
        } else if (a === '--reset' || a === '--force') {
            reset = true;
        } else if (!a.startsWith('-') && !modeStr) {
            // first positional used as mode
            modeStr = a;
        }
    }

    if (!modeStr) {
        usage('Missing mode.');
    }

    const normalized = String(modeStr).toLowerCase();
    let mode: DatabaseMode | null = null;
    switch (normalized) {
        case 'test':
            mode = DatabaseMode.Test; break;
        case 'dev':
            mode = DatabaseMode.Dev; break;
        case 'live':
            mode = DatabaseMode.Live; break;
        default:
            usage(`Unknown mode: ${modeStr}`);
    }

    return { mode: mode!, reset };
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <test|dev|live> [--reset]\n  ${script} <test|dev|live> [--reset]\n\nCreates a fresh SQLite database for the given mode using the latest schema bootstrap (v${SCHEMA_VERSION}).\n- Use this command for fresh-create workflows only; it does not perform in-place migrations.\n- Test mode always recreates the database from scratch and does not use in-place migrations.\n- Dev and live refuse to overwrite an existing DB file unless --reset is supplied.\n- With --reset, deletes the existing DB file first and recreates it from scratch.\n- Creates it with WAL + NORMAL and applies the current schema.\n`;
    if (error) console.error(`Error: ${error}\n`);
    console.log(message);
    exit(error ? 1 : 0);
}

async function main()
{
    const { mode, reset } = parseArgs();

    if (mode !== DatabaseMode.Test) {
        requireDatabaseUrlForRuntime('Database create script');
    }

    const fileLayout = new DatabaseFileLayout();
    const dbPath = fileLayout.resolveDatabasePath(mode);

    fileLayout.ensureParentDirectory(dbPath);
    if (fs.existsSync(dbPath)) {
        if (mode === DatabaseMode.Test) {
            fs.unlinkSync(dbPath);
        } else if (!reset) {
            throw new Error(`Refusing to overwrite existing database at: ${dbPath}. Re-run with --reset to replace it.`);
        }
        if (mode !== DatabaseMode.Test) {
            fs.unlinkSync(dbPath);
        }
    }

    const db = new Database(dbPath);
    // Apply preferred pragmas for new databases
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Fresh-create always applies the latest bootstrap schema in one pass.
    new LatestSchemaBootstrapper().apply(db);

    db.close();

    console.log(`Created fresh database for mode="${mode}" at: ${dbPath}`);
}

main().catch((err) => {
    console.error('Failed to create database:', err);
    exit(1);
});
