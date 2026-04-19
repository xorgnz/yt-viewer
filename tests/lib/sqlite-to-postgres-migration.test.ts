import Database from 'better-sqlite3';
import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';
import { applyLatestSchemaBootstrap } from '../../src/lib/daos/shared/LatestSchemaBootstrap';
import { SQLiteToPostgresMigrator } from '../../scripts/migrate_sqlite_to_postgres';

type QueryCall = {
    text: string;
    values: unknown[];
};

class MockPostgresProvider
{
    readonly calls: QueryCall[] = [];
    readonly targetCounts: Record<string, number>;
    readonly brokenCount: number;

    constructor(options: {
        targetCounts: Record<string, number>;
        brokenCount?: number;
    })
    {
        this.targetCounts = options.targetCounts;
        this.brokenCount = options.brokenCount || 0;
    }

    async query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>>
    {
        this.calls.push({ text, values });

        const countMatch = text.match(/SELECT COUNT\(\*\)::INTEGER AS count FROM ([a-z_]+)/);
        if (countMatch) {
            return this.buildResult([{ count: this.targetCounts[countMatch[1]] ?? 0 }] as unknown as T[]);
        }

        if (text.includes('broken_count')) {
            return this.buildResult([{ broken_count: this.brokenCount }] as unknown as T[]);
        }

        return this.buildResult([] as T[]);
    }

    private buildResult<T extends QueryResultRow>(rows: T[]): QueryResult<T>
    {
        return {
            command: 'SELECT',
            rowCount: rows.length,
            oid: 0,
            fields: [],
            rows
        };
    }
}

function createSourceDatabase(): Database.Database
{
    const db = new Database(':memory:');
    applyLatestSchemaBootstrap(db);

    db.prepare(`
        INSERT INTO profiles(id, key, name)
        VALUES(1, 'default', 'Adult')
    `).run();
    db.prepare(`
        INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
        VALUES(1, 'UC_SOURCE', 'Source', '', NULL, 1000, 2000)
    `).run();
    db.prepare(`
        INSERT INTO virtual_channels(id, name)
        VALUES(1, 'Queue')
    `).run();
    db.prepare(`
        INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
        VALUES(1, 'VID_1', 1, 'Video', '', 3000, 120, NULL, 'long')
    `).run();
    db.prepare(`
        INSERT INTO virtual_channel_assignments(id, source_channel_id, virtual_channel_id, mode, created_at, updated_at)
        VALUES(1, 1, 1, 'selected_only', 4000, 5000)
    `).run();
    db.prepare(`
        INSERT INTO virtual_channel_assignment_video_selections(id, assignment_id, video_id, review_state, created_at, updated_at)
        VALUES(1, 1, 1, 'included', 6000, 7000)
    `).run();
    db.prepare(`
        INSERT INTO video_flags(video_id, profile_id, ignored, watched, favorite, updated_at)
        VALUES(1, 1, 0, 1, 1, 8000)
    `).run();
    db.prepare(`
        INSERT INTO watch_history(id, video_id, profile_id, session_started_at, last_updated_at, time_watched_seconds)
        VALUES(1, 1, 1, 9000, 10000, 45)
    `).run();

    return db;
}

describe('SQLiteToPostgresMigrator', () => {
    it('copies source rows in dependency order with idempotent upserts and validates counts', async () => {
        const sqlite = createSourceDatabase();
        const postgres = new MockPostgresProvider({
            targetCounts: {
                profiles: 1,
                source_channels: 1,
                virtual_channels: 1,
                videos: 1,
                virtual_channel_assignments: 1,
                virtual_channel_assignment_video_selections: 1,
                video_flags: 1,
                watch_history: 1
            }
        });

        try {
            const report = await new SQLiteToPostgresMigrator(sqlite, postgres).migrate();
            const insertCalls = postgres.calls.filter((call) => call.text.includes('INSERT INTO'));

            expect(report.ok).toBe(true);
            expect(report.copiedRows).toMatchObject({
                profiles: 1,
                source_channels: 1,
                virtual_channels: 1,
                videos: 1,
                virtual_channel_assignments: 1,
                virtual_channel_assignment_video_selections: 1,
                video_flags: 1,
                watch_history: 1
            });
            expect(insertCalls.map((call) => call.text.match(/INSERT INTO ([a-z_]+)/)?.[1])).toEqual([
                'profiles',
                'source_channels',
                'virtual_channels',
                'videos',
                'virtual_channel_assignments',
                'virtual_channel_assignment_video_selections',
                'video_flags',
                'watch_history'
            ]);
            expect(insertCalls.every((call) => call.text.includes('ON CONFLICT'))).toBe(true);
            expect(insertCalls.every((call) => !call.text.includes(':id'))).toBe(true);
            expect(postgres.calls.some((call) => call.text.includes('setval'))).toBe(true);
        } finally {
            sqlite.close();
        }
    });

    it('reports validation failure when target counts differ', async () => {
        const sqlite = createSourceDatabase();
        const postgres = new MockPostgresProvider({
            targetCounts: {
                profiles: 1,
                source_channels: 0,
                virtual_channels: 1,
                videos: 1,
                virtual_channel_assignments: 1,
                virtual_channel_assignment_video_selections: 1,
                video_flags: 1,
                watch_history: 1
            }
        });

        try {
            const report = await new SQLiteToPostgresMigrator(sqlite, postgres).migrate();

            expect(report.ok).toBe(false);
            expect(report.tableCounts.find((result) => result.table === 'source_channels')).toMatchObject({
                sourceCount: 1,
                targetCount: 0,
                matches: false
            });
        } finally {
            sqlite.close();
        }
    });

    it('reports validation failure when relational integrity checks fail', async () => {
        const sqlite = createSourceDatabase();
        const postgres = new MockPostgresProvider({
            targetCounts: {
                profiles: 1,
                source_channels: 1,
                virtual_channels: 1,
                videos: 1,
                virtual_channel_assignments: 1,
                virtual_channel_assignment_video_selections: 1,
                video_flags: 1,
                watch_history: 1
            },
            brokenCount: 1
        });

        try {
            const report = await new SQLiteToPostgresMigrator(sqlite, postgres).migrate();

            expect(report.ok).toBe(false);
            expect(report.integrityChecks.some((result) => result.brokenCount === 1 && !result.ok)).toBe(true);
        } finally {
            sqlite.close();
        }
    });
});
// apply-patch-anchor - do not delete
