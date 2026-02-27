#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { SchemaVersionDAO } from '$lib/daos/schemaVersionDAO';
import { SCHEMA_VERSION } from '$lib/daos/_schema';
import { DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';

type ModeArg = DatabaseMode;

function parseArgs(): { mode: ModeArg }
{
    const args = argv.slice(2);
    let modeStr: string | undefined;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--mode=')) { modeStr = a.split('=')[1]; break; }
        if (a === '--mode' || a === '-m') { modeStr = args[i + 1]; break; }
        if (!a.startsWith('-') && !modeStr) { modeStr = a; break; }
    }
    if (!modeStr) usage('Missing mode.');
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
    const message = `\nUsage:\n  ${script} --mode <test|dev|live>\n  ${script} <test|dev|live>\n\nUpgrades an existing SQLite database in-place to the latest schema (v${SCHEMA_VERSION}).\n- Safe to run multiple times; it will skip if already up to date.\n- Only supports migrations from v2 -> v3 for now.\n`;
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

function columnExists(db: Database.Database, table: string, column: string): boolean
{
    try {
        const rows = db.prepare(`PRAGMA table_info(${table});`).all() as Array<{ name: string }>;
        return rows.some(r => r.name === column);
    } catch { return false; }
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
        // Prefer WAL/NORMAL pragmas but don't enforce
        try { db.pragma('journal_mode = WAL'); db.pragma('synchronous = NORMAL'); } catch {}

        const schemaDAO = new SchemaVersionDAO(db);
        schemaDAO.createMetaTable();
        let current = schemaDAO.get();

        // If unknown, infer based on presence of the new column
        if (current == null) {
            const hasCol = columnExists(db, 'source_channels', 'last_refreshed_at');
            current = hasCol ? 3 : 2;
            console.log(`Inferred schema version: ${current} (meta row was missing)`);
        }

        if (current >= SCHEMA_VERSION) {
            console.log(`Database already up to date (v${current}). Nothing to do.`);
            return;
        }

        if (current !== 2) {
            throw new Error(`Unsupported migration path: v${current} -> v${SCHEMA_VERSION}. This script only supports v2 -> v3.`);
        }

        // v2 -> v3: add last_refreshed_at column to source_channels
        const tx = db.transaction(() => {
            const already = columnExists(db, 'source_channels', 'last_refreshed_at');
            if (!already) {
                db.exec(`ALTER TABLE source_channels ADD COLUMN last_refreshed_at INTEGER DEFAULT NULL;`);
            }
            schemaDAO.set(3);
        });
        tx();

        console.log(`Migration complete: v2 -> v3 at ${dbPath}`);
    } finally {
        db.close();
    }
}

main().catch((err) => {
    console.error('Migration failed:', err?.message || err);
    exit(1);
});
