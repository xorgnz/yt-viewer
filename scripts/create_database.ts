#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { SchemaVersionDAO } from '../src/lib/daos/schemaVersionDAO';
import {ALL_DDL, SCHEMA_VERSION} from '../src/lib/daos/_schema';
import {DatabaseMode} from "../src/lib/daos/shared/DatabaseWrapper";

function parseArgs(): { mode: DatabaseMode }
{
    // Supports: --mode=dev | --mode dev | dev (positional)
    const args = argv.slice(2);
    let modeStr: string | undefined;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--mode=')) {
            modeStr = a.split('=')[1];
            break;
        } else if (a === '--mode' || a === '-m') {
            modeStr = args[i + 1];
            break;
        } else if (!a.startsWith('-') && !modeStr) {
            // first positional used as mode
            modeStr = a;
            break;
        }
    }

    if (!modeStr) {
        usage('Missing mode.');
    }

    const normalized = String(modeStr).toLowerCase();
    let mode: DatabaseMode | null = null;
    switch (normalized) {
        case DatabaseMode.Test:
            mode = DatabaseMode.Test; break;
        case DatabaseMode.Dev:
            mode = DatabaseMode.Dev; break;
        case DatabaseMode.Live:
            mode = DatabaseMode.Live; break;
        default:
            usage(`Unknown mode: ${modeStr}`);
    }

    return { mode: mode! };
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <test|dev|live>\n  ${script} <test|dev|live>\n\nCreates a fresh SQLite database for the given mode.\n- Deletes any existing DB file for that mode.\n- Recreates it with WAL + NORMAL and applies the current schema.\n`;
    if (error) console.error(`Error: ${error}\n`);
    console.log(message);
    exit(error ? 1 : 0);
}

async function main()
{
    const { mode } = parseArgs();
    const { dbPath } = resolveDbPath(mode);

    ensureDir(dbPath);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    const db = new Database(dbPath);
    // Apply preferred pragmas for new databases
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Initialize schema versioning/meta and run DDL
    const schemaDAO = new SchemaVersionDAO(db);
    schemaDAO.createMetaTable();
    const current = schemaDAO.get();
    if (current === null || current < SCHEMA_VERSION) {
        const tx = db.transaction(() => {
            for (const ddl of ALL_DDL) db.exec(ddl);
            schemaDAO.set(SCHEMA_VERSION);
        });
        tx();
    }

    db.close();

    console.log(`Created fresh database for mode="${mode}" at: ${dbPath}`);
}

main().catch((err) => {
    console.error('Failed to create database:', err);
    exit(1);
});

function resolveDbPath(mode: DatabaseMode): { dbPath: string }
{
    const baseDir = process.env.YTCW_DB_DIR || '.data';
    const defaults = { test: 'test.db', dev: 'dev.db', live: process.env.YTCW_DB_FILE || 'app.db' } as const;
    const file = mode === DatabaseMode.Test
        ? defaults.test
        : mode === DatabaseMode.Dev
            ? defaults.dev
            : defaults.live;
    const dbPath = path.resolve(process.cwd(), baseDir, file);
    return { dbPath };
}

function ensureDir(filePath: string): void
{
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
