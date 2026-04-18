#!/usr/bin/env node
import fs from 'node:fs';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { QueryResult, QueryResultRow } from 'pg';
import { PostgresSqlBinder, type PostgresSqlParams } from '$lib/daos/shared/PostgresDAO';
import { applyLatestPostgresSchemaBootstrap } from '$lib/daos/shared/LatestSchemaBootstrap';
import { PostgresPoolWrapper } from '$lib/daos/shared/PostgresPoolWrapper';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

type QueryProvider = {
    query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
};

type TableCopyDefinition = {
    table: string;
    columns: string[];
    orderBy: string;
    conflictTarget: string;
    updateColumns: string[];
    identityColumn?: string;
};

export type TableMigrationCount = {
    table: string;
    sourceCount: number;
    targetCount: number;
    matches: boolean;
};

export type IntegrityCheckResult = {
    name: string;
    brokenCount: number;
    ok: boolean;
};

export type SQLiteToPostgresMigrationReport = {
    copiedRows: Record<string, number>;
    tableCounts: TableMigrationCount[];
    integrityChecks: IntegrityCheckResult[];
    ok: boolean;
};

const TABLES: TableCopyDefinition[] = [
    {
        table: 'profiles',
        columns: ['id', 'key', 'name'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['key', 'name'],
        identityColumn: 'id'
    },
    {
        table: 'source_channels',
        columns: ['id', 'youtube_id', 'title', 'description', 'thumbnail_url', 'published_at', 'last_refreshed_at'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['youtube_id', 'title', 'description', 'thumbnail_url', 'published_at', 'last_refreshed_at'],
        identityColumn: 'id'
    },
    {
        table: 'virtual_channels',
        columns: ['id', 'name'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['name'],
        identityColumn: 'id'
    },
    {
        table: 'videos',
        columns: ['id', 'youtube_id', 'channel_id', 'title', 'description', 'published_at', 'duration_seconds', 'thumbnail_url', 'length_classification'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['youtube_id', 'channel_id', 'title', 'description', 'published_at', 'duration_seconds', 'thumbnail_url', 'length_classification'],
        identityColumn: 'id'
    },
    {
        table: 'virtual_channel_assignments',
        columns: ['id', 'source_channel_id', 'virtual_channel_id', 'mode', 'created_at', 'updated_at'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['source_channel_id', 'virtual_channel_id', 'mode', 'created_at', 'updated_at'],
        identityColumn: 'id'
    },
    {
        table: 'virtual_channel_assignment_video_selections',
        columns: ['id', 'assignment_id', 'video_id', 'review_state', 'created_at', 'updated_at'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['assignment_id', 'video_id', 'review_state', 'created_at', 'updated_at'],
        identityColumn: 'id'
    },
    {
        table: 'video_flags',
        columns: ['video_id', 'profile_id', 'ignored', 'watched', 'favorite', 'updated_at'],
        orderBy: 'video_id, profile_id',
        conflictTarget: 'video_id, profile_id',
        updateColumns: ['ignored', 'watched', 'favorite', 'updated_at']
    },
    {
        table: 'watch_history',
        columns: ['id', 'video_id', 'profile_id', 'session_started_at', 'last_updated_at', 'time_watched_seconds'],
        orderBy: 'id',
        conflictTarget: 'id',
        updateColumns: ['video_id', 'profile_id', 'session_started_at', 'last_updated_at', 'time_watched_seconds'],
        identityColumn: 'id'
    }
];

const INTEGRITY_CHECKS = [
    {
        name: 'videos.channel_id -> source_channels.id',
        sql: `
            SELECT COUNT(*)::INTEGER AS broken_count
            FROM videos v
            LEFT JOIN source_channels sc ON sc.id = v.channel_id
            WHERE sc.id IS NULL
        `
    },
    {
        name: 'virtual_channel_assignments source and virtual channel references',
        sql: `
            SELECT COUNT(*)::INTEGER AS broken_count
            FROM virtual_channel_assignments a
            LEFT JOIN source_channels sc ON sc.id = a.source_channel_id
            LEFT JOIN virtual_channels vc ON vc.id = a.virtual_channel_id
            WHERE sc.id IS NULL OR vc.id IS NULL
        `
    },
    {
        name: 'virtual_channel_assignment_video_selections assignment and video references',
        sql: `
            SELECT COUNT(*)::INTEGER AS broken_count
            FROM virtual_channel_assignment_video_selections s
            LEFT JOIN virtual_channel_assignments a ON a.id = s.assignment_id
            LEFT JOIN videos v ON v.id = s.video_id
            WHERE a.id IS NULL OR v.id IS NULL
        `
    },
    {
        name: 'video_flags video and profile references',
        sql: `
            SELECT COUNT(*)::INTEGER AS broken_count
            FROM video_flags vf
            LEFT JOIN videos v ON v.id = vf.video_id
            LEFT JOIN profiles p ON p.id = vf.profile_id
            WHERE v.id IS NULL OR p.id IS NULL
        `
    },
    {
        name: 'watch_history video and profile references',
        sql: `
            SELECT COUNT(*)::INTEGER AS broken_count
            FROM watch_history wh
            LEFT JOIN videos v ON v.id = wh.video_id
            LEFT JOIN profiles p ON p.id = wh.profile_id
            WHERE v.id IS NULL OR p.id IS NULL
        `
    }
];

export class SQLiteToPostgresMigrator
{
    private readonly sqlite: Database.Database;
    private readonly postgres: QueryProvider;

    constructor(sqlite: Database.Database, postgres: QueryProvider)
    {
        this.sqlite = sqlite;
        this.postgres = postgres;
    }

    async migrate(): Promise<SQLiteToPostgresMigrationReport>
    {
        const copiedRows: Record<string, number> = {};

        await this.postgres.query('BEGIN');

        try {
            for (const table of TABLES) {
                copiedRows[table.table] = await this.copyTable(table);
            }

            for (const table of TABLES) {
                if (table.identityColumn) {
                    await this.resetIdentity(table.table, table.identityColumn);
                }
            }

            await this.postgres.query('COMMIT');
        } catch (error) {
            await this.postgres.query('ROLLBACK');
            throw error;
        }

        const tableCounts = await this.validateTableCounts();
        const integrityChecks = await this.validateIntegrity();
        const ok = tableCounts.every((result) => result.matches)
            && integrityChecks.every((result) => result.ok);

        return {
            copiedRows,
            tableCounts,
            integrityChecks,
            ok
        };
    }

    async validateTableCounts(): Promise<TableMigrationCount[]>
    {
        const results: TableMigrationCount[] = [];

        for (const table of TABLES) {
            const sourceCount = this.countSourceRows(table.table);
            const targetCount = await this.countTargetRows(table.table);

            results.push({
                table: table.table,
                sourceCount,
                targetCount,
                matches: sourceCount === targetCount
            });
        }

        return results;
    }

    async validateIntegrity(): Promise<IntegrityCheckResult[]>
    {
        const results: IntegrityCheckResult[] = [];

        for (const check of INTEGRITY_CHECKS) {
            const result = await this.postgres.query<{ broken_count: number }>(check.sql);
            const brokenCount = Number(result.rows[0]?.broken_count ?? 0);

            results.push({
                name: check.name,
                brokenCount,
                ok: brokenCount === 0
            });
        }

        return results;
    }

    private async copyTable(table: TableCopyDefinition): Promise<number>
    {
        const rows = this.sqlite
            .prepare(`SELECT ${table.columns.join(', ')} FROM ${table.table} ORDER BY ${table.orderBy}`)
            .all() as Array<Record<string, unknown>>;
        const sql = this.buildUpsertSql(table);

        for (const row of rows) {
            await this.runBound(sql, row);
        }

        return rows.length;
    }

    private buildUpsertSql(table: TableCopyDefinition): string
    {
        const columnList = table.columns.join(', ');
        const valueList = table.columns.map((column) => `:${column}`).join(', ');
        const updateList = table.updateColumns
            .map((column) => `${column} = EXCLUDED.${column}`)
            .join(', ');

        return `
            INSERT INTO ${table.table} (${columnList})
            VALUES (${valueList})
            ON CONFLICT (${table.conflictTarget}) DO UPDATE SET ${updateList}
        `;
    }

    private async resetIdentity(table: string, identityColumn: string): Promise<void>
    {
        await this.postgres.query(`
            SELECT setval(
                pg_get_serial_sequence('${table}', '${identityColumn}'),
                COALESCE((SELECT MAX(${identityColumn}) FROM ${table}), 1),
                (SELECT COUNT(*) > 0 FROM ${table})
            )
        `);
    }

    private countSourceRows(table: string): number
    {
        const row = this.sqlite
            .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
            .get() as { count: number };

        return Number(row.count);
    }

    private async countTargetRows(table: string): Promise<number>
    {
        const result = await this.postgres.query<{ count: number }>(`SELECT COUNT(*)::INTEGER AS count FROM ${table}`);
        return Number(result.rows[0]?.count ?? 0);
    }

    private async runBound(sql: string, params: PostgresSqlParams): Promise<void>
    {
        const boundSql = PostgresSqlBinder.bind(sql, params);
        await this.postgres.query(boundSql.text, boundSql.values);
    }
}

function parseArgs(): { sqlitePath: string; skipBootstrap: boolean }
{
    const args = argv.slice(2);
    let sqlitePath = '';
    let skipBootstrap = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--sqlite' || arg === '--sqlite-path') {
            sqlitePath = args[i + 1] || '';
            i += 1;
        } else if (arg.startsWith('--sqlite=')) {
            sqlitePath = arg.split('=').slice(1).join('=');
        } else if (arg === '--skip-bootstrap') {
            skipBootstrap = true;
        } else if (!arg.startsWith('-') && !sqlitePath) {
            sqlitePath = arg;
        } else {
            usage(`Unknown argument: ${arg}`);
        }
    }

    if (!sqlitePath) {
        usage('Missing SQLite database path.');
    }

    return {
        sqlitePath: path.resolve(sqlitePath),
        skipBootstrap
    };
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --sqlite <path-to-sqlite-db> [--skip-bootstrap]\n  ${script} <path-to-sqlite-db> [--skip-bootstrap]\n\nCopies existing SQLite application data into the Postgres database configured by DATABASE_URL.\n- Rows are copied in deterministic dependency order with source IDs preserved.\n- Re-running against the same target is idempotent through ON CONFLICT updates.\n- The command validates target row counts and key relational integrity after copying.\n- By default, the latest Postgres schema bootstrap runs before copying.\n`;

    if (error) {
        console.error(`Error: ${error}\n`);
    }

    console.log(message);
    exit(error ? 1 : 0);
}

function printReport(report: SQLiteToPostgresMigrationReport): void
{
    console.log('Copied rows:');
    for (const [table, count] of Object.entries(report.copiedRows)) {
        console.log(`  ${table}: ${count}`);
    }

    console.log('Row-count validation:');
    for (const result of report.tableCounts) {
        const status = result.matches ? 'ok' : 'mismatch';
        console.log(`  ${result.table}: sqlite=${result.sourceCount} postgres=${result.targetCount} ${status}`);
    }

    console.log('Integrity validation:');
    for (const result of report.integrityChecks) {
        const status = result.ok ? 'ok' : 'failed';
        console.log(`  ${result.name}: broken=${result.brokenCount} ${status}`);
    }

    console.log(report.ok ? 'SQLite-to-Postgres migration validation passed.' : 'SQLite-to-Postgres migration validation failed.');
}

async function main(): Promise<void>
{
    const { sqlitePath, skipBootstrap } = parseArgs();

    if (!fs.existsSync(sqlitePath)) {
        throw new Error(`SQLite database not found: ${sqlitePath}`);
    }

    const databaseUrl = requireDatabaseUrlForRuntime('SQLite-to-Postgres migration script', {
        allowMissingInTest: false,
    });
    const sqlite = new Database(sqlitePath, { readonly: true });
    const pool = new PostgresPoolWrapper({ connectionString: databaseUrl });

    try {
        if (!skipBootstrap) {
            await applyLatestPostgresSchemaBootstrap(pool);
        }

        const report = await new SQLiteToPostgresMigrator(sqlite, pool).migrate();
        printReport(report);

        if (!report.ok) {
            exit(1);
        }
    } finally {
        sqlite.close();
        await pool.close();
    }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const scriptPath = fileURLToPath(import.meta.url);

if (entryPath === scriptPath) {
    main().catch((err) => {
        console.error('SQLite-to-Postgres migration failed:', err?.message || err);
        exit(1);
    });
}
