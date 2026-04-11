#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DatabaseMode } from '$lib/daos/shared/DatabaseWrapper';
import { MigrationRunner } from '$lib/daos/shared/MigrationRunner';
import { SqliteMigrationAdapter } from '$lib/daos/shared/SqliteMigrationAdapter';
import { MIGRATIONS } from '$lib/daos/migrations/registry';

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

function formatTimestamp(date: Date): string
{
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function createBackupPath(dbPath: string): string
{
    const parsedPath = path.parse(dbPath);
    return path.join(parsedPath.dir, `${parsedPath.name}-${formatTimestamp(new Date())}.bak${parsedPath.ext}`);
}

function createPreMigrationBackup(dbPath: string): string
{
    const backupPath = createBackupPath(dbPath);
    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
}

function createFailedArtifactPath(dbPath: string): string
{
    const parsedPath = path.parse(dbPath);
    return path.join(parsedPath.dir, `${parsedPath.name}-${formatTimestamp(new Date())}.failed${parsedPath.ext}`);
}

async function main()
{
    const { mode } = parseArgs();
    const { dbPath } = resolveDbPath(mode);

    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}. Create it first with: npm run create_database -- ${mode}`);
    }

    const backupPath = createPreMigrationBackup(dbPath);
    let db: Database.Database | null = new Database(dbPath);
    try {
        const runner = new MigrationRunner(new SqliteMigrationAdapter(db), MIGRATIONS);
        const result = runner.runToLatest();

        // Report the discovered state and the upgrade result in a consistent format.
        console.log(`Database path: ${dbPath}`);
        console.log(`Backup created: ${backupPath}`);
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
        if (db) {
            db.close();
            db = null;
        }

        const failedArtifactPath = createFailedArtifactPath(dbPath);
        fs.copyFileSync(dbPath, failedArtifactPath);
        fs.copyFileSync(backupPath, dbPath);
        throw new Error(
            `Migration failed. Restored database: ${dbPath}. Backup: ${backupPath}. Failed artifact: ${failedArtifactPath}. ${error instanceof Error ? error.message : String(error)}`
        );
    } finally {
        if (db) {
            db.close();
        }
    }
}

main().catch((err) => {
    console.error('Database migration failed:', err?.message || err);
    exit(1);
});
