#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { ALL_DDL, SCHEMA_VERSION } from '$lib/daos/_schema';
import { DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';

type ModeArg = DatabaseMode;

function parseArgs(): { mode: ModeArg; reset: boolean }
{
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
            modeStr = a;
        }
    }

    if (!modeStr) usage('Missing mode.');
    const normalized = String(modeStr).toLowerCase();
    switch (normalized) {
        case 'test': return { mode: DatabaseMode.Test, reset };
        case 'dev': return { mode: DatabaseMode.Dev, reset };
        case 'live': return { mode: DatabaseMode.Live, reset };
        default: usage(`Unknown mode: ${modeStr}`);
    }
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <test|dev|live> --reset\n  ${script} <test|dev|live> --reset\n\nReplaces an existing SQLite database with the current schema (v${SCHEMA_VERSION}).\n- Incremental in-place migrations are no longer supported for this feature line.\n- This command requires --reset and deletes the existing DB file before recreating it.\n- If the DB file does not exist yet, use create_database instead.\n`;
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

function ensureDir(filePath: string): void
{
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main()
{
    const { mode, reset } = parseArgs();
    const { dbPath } = resolveDbPath(mode);

    if (!reset) {
        usage('This command only supports full database replacement. Re-run with --reset.');
    }

    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}. Create it first with: npm run create_database -- ${mode}`);
    }

    ensureDir(dbPath);
    fs.unlinkSync(dbPath);

    const db = new Database(dbPath);
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');

        const schemaDAO = new SchemaVersionDAO(db);
        schemaDAO.createMetaTable();

        const tx = db.transaction(() => {
            for (const ddl of ALL_DDL) db.exec(ddl);
            schemaDAO.set(SCHEMA_VERSION);
        });
        tx();

        console.log(`Recreated database with schema v${SCHEMA_VERSION} at: ${dbPath}`);
    } finally {
        db.close();
    }
}

main().catch((err) => {
    console.error('Database reset failed:', err?.message || err);
    exit(1);
});
