#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CREATE_INDEXES } from '$lib/daos/_schema';
import { DatabaseMode } from '$lib/daos/shared/DatabaseMode';
import { DatabasePool } from '$lib/daos/shared/DatabasePool';
import { requireDatabaseUrlForRuntime } from '$lib/server/RuntimeDatabaseUrl';

type ModeArg = DatabaseMode.Dev | DatabaseMode.Live;
type DatabaseClientProvider = Pick<DatabasePool, 'query'>;

type StableIdMigrationArgs = {
    mode: ModeArg;
    apply: boolean;
};

type LegacyVirtualChannelRow = {
    id: number;
    name: string;
};

type StableVirtualChannelIdMapping = {
    legacyId: number;
    vchannelId: string;
};

type SqlStep = {
    description: string;
    sql: string;
    values?: unknown[];
};

type StableIdMigrationPlan = {
    counts: Record<string, number>;
    mappings: StableVirtualChannelIdMapping[];
    steps: SqlStep[];
};

type StableIdMigrationResult = StableIdMigrationPlan & {
    applied: boolean;
};

const VCHANNEL_ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789';
const LEGACY_TABLE_NAMES = [
    'source_channels',
    'videos',
    'virtual_channels',
    'virtual_channel_assignments',
    'virtual_channel_assignment_video_selections',
    'profiles',
    'video_flags',
    'watch_history',
    '_meta',
    'migration_history'
] as const;
const LEGACY_COLUMN_REQUIREMENTS: Record<string, string[]> = {
    source_channels: ['id', 'youtube_id', 'title', 'description', 'thumbnail_url', 'published_at', 'last_refreshed_at'],
    videos: ['id', 'youtube_id', 'channel_id', 'title', 'description', 'published_at', 'duration_seconds', 'thumbnail_url', 'length_classification'],
    virtual_channels: ['id', 'name', 'daily_timer_max'],
    virtual_channel_assignments: ['id', 'source_channel_id', 'virtual_channel_id', 'mode', 'created_at', 'updated_at'],
    virtual_channel_assignment_video_selections: ['assignment_id', 'video_id', 'review_state', 'created_at', 'updated_at'],
    profiles: ['id', 'key', 'name'],
    video_flags: ['video_id', 'profile_id', 'ignored', 'watched', 'favorite', 'updated_at'],
    watch_history: ['id', 'video_id', 'profile_id', 'session_started_at', 'last_updated_at', 'time_watched_seconds'],
    _meta: ['key', 'value']
};
const LEGACY_BACKUP_TABLE_NAMES = [
    'legacy_source_channels',
    'legacy_videos',
    'legacy_virtual_channels',
    'legacy_virtual_channel_assignments',
    'legacy_virtual_channel_assignment_video_selections',
    'legacy_profiles',
    'legacy_video_flags',
    'legacy_watch_history'
] as const;
const SHADOW_TABLE_NAMES = [
    '__stable_source_channels',
    '__stable_videos',
    '__stable_virtual_channels',
    '__stable_virtual_channel_assignments',
    '__stable_virtual_channel_assignment_video_selections',
    '__stable_profiles',
    '__stable_video_flags',
    '__stable_watch_history'
] as const;
const COUNTED_LEGACY_TABLES = [
    'source_channels',
    'videos',
    'virtual_channels',
    'virtual_channel_assignments',
    'virtual_channel_assignment_video_selections',
    'profiles',
    'video_flags',
    'watch_history'
] as const;
const SHADOW_FOREIGN_KEY_STEPS: SqlStep[] = [
    {
        description: 'Add stable foreign key from videos to source channels',
        sql: 'ALTER TABLE videos ADD CONSTRAINT fk_videos_src_channel FOREIGN KEY (src_channel_id) REFERENCES source_channels(src_channel_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from assignments to source channels',
        sql: 'ALTER TABLE virtual_channel_assignments ADD CONSTRAINT fk_vca_src_channel FOREIGN KEY (src_channel_id) REFERENCES source_channels(src_channel_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from assignments to virtual channels',
        sql: 'ALTER TABLE virtual_channel_assignments ADD CONSTRAINT fk_vca_vchannel FOREIGN KEY (vchannel_id) REFERENCES virtual_channels(vchannel_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable composite foreign key from selections to assignments',
        sql: 'ALTER TABLE virtual_channel_assignment_video_selections ADD CONSTRAINT fk_vcavs_assignment FOREIGN KEY (src_channel_id, vchannel_id) REFERENCES virtual_channel_assignments(src_channel_id, vchannel_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from selections to videos',
        sql: 'ALTER TABLE virtual_channel_assignment_video_selections ADD CONSTRAINT fk_vcavs_video FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from flags to videos',
        sql: 'ALTER TABLE video_flags ADD CONSTRAINT fk_video_flags_video FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from flags to profiles',
        sql: 'ALTER TABLE video_flags ADD CONSTRAINT fk_video_flags_profile FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from watch history to videos',
        sql: 'ALTER TABLE watch_history ADD CONSTRAINT fk_watch_history_video FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE'
    },
    {
        description: 'Add stable foreign key from watch history to profiles',
        sql: 'ALTER TABLE watch_history ADD CONSTRAINT fk_watch_history_profile FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE ON UPDATE CASCADE'
    }
];

function parseArgs(): StableIdMigrationArgs
{
    const args = argv.slice(2);
    let modeStr: string | undefined;
    let apply = false;

    for (let index = 0; index < args.length; index += 1) {
        const value = args[index];

        if (value.startsWith('--mode=')) {
            modeStr = value.split('=')[1];
        } else if (value === '--mode' || value === '-m') {
            modeStr = args[index + 1];
            index += 1;
        } else if (value === '--apply') {
            apply = true;
        } else if (value === '--dry-run') {
            apply = false;
        } else if (!value.startsWith('-') && !modeStr) {
            modeStr = value;
        } else {
            usage(`Unknown argument: ${value}`);
        }
    }

    if (!modeStr) {
        usage('Missing mode.');
    }

    const normalizedMode = String(modeStr).toLowerCase();
    if (normalizedMode === 'dev') {
        return { mode: DatabaseMode.Dev, apply };
    }

    if (normalizedMode === 'live') {
        return { mode: DatabaseMode.Live, apply };
    }

    usage(`Unknown mode: ${modeStr}`);
}

function usage(error?: string): never
{
    const script = path.basename(fileURLToPath(import.meta.url));
    const message = `\nUsage:\n  ${script} --mode <dev|live> [--apply]\n  ${script} <dev|live> [--apply]\n\nBuilds or executes the admin-only stable-id rewrite for legacy MySQL/MariaDB databases.\n- Default behavior is dry-run inspection only.\n- Pass --apply to execute the rewrite against DATABASE_URL.\n- This script is not app-startup migration code.\n- Run it only against a backup-verified legacy database that still uses generated row-id relationships.\n`;

    if (error) {
        console.error(`Error: ${error}\n`);
    }

    console.log(message);
    exit(error ? 1 : 0);
}

function splitStatements(sql: string): string[]
{
    return sql
        .split(';')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);
}

function buildDeterministicVChannelId(seed: string): string
{
    const digest = createHash('sha256').update(seed).digest();
    let suffix = '';

    for (let index = 0; index < 16; index += 1) {
        suffix += VCHANNEL_ALPHABET[digest[index] % VCHANNEL_ALPHABET.length];
    }

    return `vc_${suffix}`;
}

export function buildStableVirtualChannelIdMappings(rows: LegacyVirtualChannelRow[]): StableVirtualChannelIdMapping[]
{
    const usedIds = new Set<string>();
    const mappings: StableVirtualChannelIdMapping[] = [];

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        let salt = 0;
        let vchannelId = '';

        do {
            vchannelId = buildDeterministicVChannelId(`legacy-virtual-channel:${index}:${row.id}:${row.name}:${salt}`);
            salt += 1;
        } while (usedIds.has(vchannelId));

        usedIds.add(vchannelId);
        mappings.push({
            legacyId: row.id,
            vchannelId
        });
    }

    return mappings;
}

async function loadExistingTableNames(pool: DatabaseClientProvider, names: readonly string[]): Promise<Set<string>>
{
    const placeholders = names.map(() => '?').join(', ');
    const rows = await pool.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
    `, [...names]);

    return new Set(rows.rows.map((row) => row.table_name));
}

async function assertLegacySchemaShape(pool: DatabaseClientProvider): Promise<void>
{
    const placeholders = LEGACY_TABLE_NAMES.map(() => '?').join(', ');
    const rows = await pool.query<{ table_name: string; column_name: string }>(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
    `, [...LEGACY_TABLE_NAMES]);
    const columnsByTable = new Map<string, Set<string>>();

    for (const row of rows.rows) {
        if (!columnsByTable.has(row.table_name)) {
            columnsByTable.set(row.table_name, new Set());
        }

        columnsByTable.get(row.table_name)!.add(row.column_name);
    }

    for (const [tableName, requiredColumns] of Object.entries(LEGACY_COLUMN_REQUIREMENTS)) {
        const presentColumns = columnsByTable.get(tableName) ?? new Set<string>();

        for (const columnName of requiredColumns) {
            if (!presentColumns.has(columnName)) {
                throw new Error(`Legacy schema preflight failed: expected column "${tableName}.${columnName}" was not found.`);
            }
        }
    }
}

async function assertNoPreexistingMigrationArtifacts(pool: DatabaseClientProvider): Promise<void>
{
    const existingBackupTables = await loadExistingTableNames(pool, LEGACY_BACKUP_TABLE_NAMES);
    if (existingBackupTables.size > 0) {
        throw new Error(`Stable-id migration refused to proceed because backup tables already exist: ${[...existingBackupTables].join(', ')}.`);
    }

    const existingShadowTables = await loadExistingTableNames(pool, SHADOW_TABLE_NAMES);
    if (existingShadowTables.size > 0) {
        throw new Error(`Stable-id migration refused to proceed because shadow tables already exist: ${[...existingShadowTables].join(', ')}.`);
    }
}

async function assertLegacyNaturalKeyIntegrity(pool: DatabaseClientProvider): Promise<void>
{
    const checks = [
        {
            description: 'source_channels.youtube_id',
            sql: 'SELECT COUNT(*) AS total_count, COUNT(DISTINCT youtube_id) AS distinct_count, SUM(CASE WHEN youtube_id IS NULL OR TRIM(youtube_id) = \'\' THEN 1 ELSE 0 END) AS null_count FROM source_channels'
        },
        {
            description: 'videos.youtube_id',
            sql: 'SELECT COUNT(*) AS total_count, COUNT(DISTINCT youtube_id) AS distinct_count, SUM(CASE WHEN youtube_id IS NULL OR TRIM(youtube_id) = \'\' THEN 1 ELSE 0 END) AS null_count FROM videos'
        },
        {
            description: 'profiles.key',
            sql: 'SELECT COUNT(*) AS total_count, COUNT(DISTINCT `key`) AS distinct_count, SUM(CASE WHEN `key` IS NULL OR TRIM(`key`) = \'\' THEN 1 ELSE 0 END) AS null_count FROM profiles'
        }
    ] as const;

    for (const check of checks) {
        const result = await pool.query<{ total_count: number; distinct_count: number; null_count: number }>(check.sql);
        const row = result.rows[0];

        if (!row) {
            throw new Error(`Stable-id migration preflight failed while checking ${check.description}.`);
        }

        if (row.null_count > 0) {
            throw new Error(`Stable-id migration preflight failed: ${check.description} contains null or blank values.`);
        }

        if (row.total_count !== row.distinct_count) {
            throw new Error(`Stable-id migration preflight failed: ${check.description} is not unique.`);
        }
    }
}

async function loadLegacyCounts(pool: DatabaseClientProvider): Promise<Record<string, number>>
{
    const counts: Record<string, number> = {};

    for (const tableName of COUNTED_LEGACY_TABLES) {
        const result = await pool.query<{ total_count: number }>(`SELECT COUNT(*) AS total_count FROM ${tableName}`);
        counts[tableName] = result.rows[0]?.total_count ?? 0;
    }

    return counts;
}

async function loadLegacyVirtualChannels(pool: DatabaseClientProvider): Promise<LegacyVirtualChannelRow[]>
{
    const result = await pool.query<LegacyVirtualChannelRow>(`
        SELECT id, name
        FROM virtual_channels
        ORDER BY id ASC
    `);

    return result.rows;
}

function buildShadowCreateSteps(): SqlStep[]
{
    return [
        { description: 'Drop stale shadow source-channel table if present', sql: 'DROP TABLE IF EXISTS __stable_source_channels' },
        { description: 'Drop stale shadow video table if present', sql: 'DROP TABLE IF EXISTS __stable_videos' },
        { description: 'Drop stale shadow virtual-channel table if present', sql: 'DROP TABLE IF EXISTS __stable_virtual_channels' },
        { description: 'Drop stale shadow assignment table if present', sql: 'DROP TABLE IF EXISTS __stable_virtual_channel_assignments' },
        { description: 'Drop stale shadow assignment-selection table if present', sql: 'DROP TABLE IF EXISTS __stable_virtual_channel_assignment_video_selections' },
        { description: 'Drop stale shadow profile table if present', sql: 'DROP TABLE IF EXISTS __stable_profiles' },
        { description: 'Drop stale shadow video-flag table if present', sql: 'DROP TABLE IF EXISTS __stable_video_flags' },
        { description: 'Drop stale shadow watch-history table if present', sql: 'DROP TABLE IF EXISTS __stable_watch_history' },
        {
            description: 'Create stable-id shadow source-channel table',
            sql: `
                CREATE TABLE __stable_source_channels (
                    src_channel_id VARCHAR(255) NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT NULL,
                    thumbnail_url TEXT DEFAULT NULL,
                    published_at BIGINT DEFAULT NULL,
                    last_refreshed_at BIGINT DEFAULT NULL,
                    PRIMARY KEY (src_channel_id)
                )
            `
        },
        {
            description: 'Create stable-id shadow virtual-channel table',
            sql: `
                CREATE TABLE __stable_virtual_channels (
                    vchannel_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    daily_timer_max INT DEFAULT NULL,
                    PRIMARY KEY (vchannel_id)
                )
            `
        },
        {
            description: 'Create stable-id shadow assignment table',
            sql: `
                CREATE TABLE __stable_virtual_channel_assignments (
                    src_channel_id VARCHAR(255) NOT NULL,
                    vchannel_id VARCHAR(255) NOT NULL,
                    mode VARCHAR(32) NOT NULL DEFAULT 'all',
                    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
                    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
                    PRIMARY KEY (src_channel_id, vchannel_id),
                    CHECK (mode IN ('all', 'long_only', 'selected_only'))
                )
            `
        },
        {
            description: 'Create stable-id shadow video table',
            sql: `
                CREATE TABLE __stable_videos (
                    video_id VARCHAR(255) NOT NULL,
                    src_channel_id VARCHAR(255) NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT NULL,
                    published_at BIGINT DEFAULT NULL,
                    duration_seconds INT DEFAULT NULL,
                    thumbnail_url TEXT DEFAULT NULL,
                    length_classification VARCHAR(32) DEFAULT 'unknown',
                    PRIMARY KEY (video_id),
                    CHECK (length_classification IN ('long', 'short', 'unknown'))
                )
            `
        },
        {
            description: 'Create stable-id shadow assignment-selection table',
            sql: `
                CREATE TABLE __stable_virtual_channel_assignment_video_selections (
                    src_channel_id VARCHAR(255) NOT NULL,
                    vchannel_id VARCHAR(255) NOT NULL,
                    video_id VARCHAR(255) NOT NULL,
                    review_state VARCHAR(32) NOT NULL DEFAULT 'not_yet_reviewed',
                    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
                    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
                    PRIMARY KEY (src_channel_id, vchannel_id, video_id),
                    CHECK (review_state IN ('included', 'ignored', 'not_yet_reviewed'))
                )
            `
        },
        {
            description: 'Create stable-id shadow profile table',
            sql: `
                CREATE TABLE __stable_profiles (
                    profile_id VARCHAR(255) NOT NULL,
                    name TEXT NOT NULL,
                    PRIMARY KEY (profile_id)
                )
            `
        },
        {
            description: 'Create stable-id shadow video-flag table',
            sql: `
                CREATE TABLE __stable_video_flags (
                    video_id VARCHAR(255) NOT NULL,
                    profile_id VARCHAR(255) NOT NULL,
                    ignored TINYINT NOT NULL DEFAULT 0,
                    watched TINYINT NOT NULL DEFAULT 0,
                    favorite TINYINT NOT NULL DEFAULT 0,
                    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
                    PRIMARY KEY (video_id, profile_id)
                )
            `
        },
        {
            description: 'Create stable-id shadow watch-history table',
            sql: `
                CREATE TABLE __stable_watch_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    video_id VARCHAR(255) NOT NULL,
                    profile_id VARCHAR(255) NOT NULL,
                    session_started_at BIGINT NOT NULL,
                    last_updated_at BIGINT NOT NULL,
                    time_watched_seconds INT NOT NULL DEFAULT 0
                )
            `
        }
    ];
}

function buildShadowLoadSteps(mappings: StableVirtualChannelIdMapping[]): SqlStep[]
{
    const mappingSteps: SqlStep[] = [
        {
            description: 'Drop stale virtual-channel mapping table if present',
            sql: 'DROP TABLE IF EXISTS __stable_vchannel_id_map'
        },
        {
            description: 'Create deterministic virtual-channel id mapping table',
            sql: `
                CREATE TABLE __stable_vchannel_id_map (
                    legacy_id INT NOT NULL,
                    vchannel_id VARCHAR(255) NOT NULL,
                    PRIMARY KEY (legacy_id),
                    UNIQUE KEY uq_stable_vchannel_id_map_vchannel_id (vchannel_id)
                )
            `
        }
    ];

    for (const mapping of mappings) {
        mappingSteps.push({
            description: `Map legacy virtual channel ${mapping.legacyId} to ${mapping.vchannelId}`,
            sql: 'INSERT INTO __stable_vchannel_id_map(legacy_id, vchannel_id) VALUES(?, ?)',
            values: [mapping.legacyId, mapping.vchannelId]
        });
    }

    return [
        ...mappingSteps,
        {
            description: 'Copy source channels into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_source_channels(src_channel_id, title, description, thumbnail_url, published_at, last_refreshed_at)
                SELECT youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at
                FROM source_channels
                ORDER BY id ASC
            `
        },
        {
            description: 'Copy virtual channels into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_virtual_channels(vchannel_id, name, daily_timer_max)
                SELECT map.vchannel_id, vc.name, vc.daily_timer_max
                FROM virtual_channels vc
                INNER JOIN __stable_vchannel_id_map map
                    ON map.legacy_id = vc.id
                ORDER BY vc.id ASC
            `
        },
        {
            description: 'Copy videos into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_videos(video_id, src_channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
                SELECT v.youtube_id, sc.youtube_id, v.title, v.description, v.published_at, v.duration_seconds, v.thumbnail_url, v.length_classification
                FROM videos v
                INNER JOIN source_channels sc
                    ON sc.id = v.channel_id
                ORDER BY v.id ASC
            `
        },
        {
            description: 'Copy virtual-channel assignments into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_virtual_channel_assignments(src_channel_id, vchannel_id, mode, created_at, updated_at)
                SELECT sc.youtube_id, map.vchannel_id, a.mode, a.created_at, a.updated_at
                FROM virtual_channel_assignments a
                INNER JOIN source_channels sc
                    ON sc.id = a.source_channel_id
                INNER JOIN __stable_vchannel_id_map map
                    ON map.legacy_id = a.virtual_channel_id
                ORDER BY a.id ASC
            `
        },
        {
            description: 'Copy assignment video selections into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_virtual_channel_assignment_video_selections(src_channel_id, vchannel_id, video_id, review_state, created_at, updated_at)
                SELECT sc.youtube_id, map.vchannel_id, v.youtube_id, s.review_state, s.created_at, s.updated_at
                FROM virtual_channel_assignment_video_selections s
                INNER JOIN virtual_channel_assignments a
                    ON a.id = s.assignment_id
                INNER JOIN source_channels sc
                    ON sc.id = a.source_channel_id
                INNER JOIN __stable_vchannel_id_map map
                    ON map.legacy_id = a.virtual_channel_id
                INNER JOIN videos v
                    ON v.id = s.video_id
                ORDER BY a.id ASC, s.video_id ASC
            `
        },
        {
            description: 'Copy profiles into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_profiles(profile_id, name)
                SELECT \`key\`, name
                FROM profiles
                ORDER BY id ASC
            `
        },
        {
            description: 'Copy video flags into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_video_flags(video_id, profile_id, ignored, watched, favorite, updated_at)
                SELECT v.youtube_id, p.\`key\`, vf.ignored, vf.watched, vf.favorite, vf.updated_at
                FROM video_flags vf
                INNER JOIN videos v
                    ON v.id = vf.video_id
                INNER JOIN profiles p
                    ON p.id = vf.profile_id
                ORDER BY v.id ASC, p.id ASC
            `
        },
        {
            description: 'Copy watch-history sessions into the stable-id shadow table',
            sql: `
                INSERT INTO __stable_watch_history(id, video_id, profile_id, session_started_at, last_updated_at, time_watched_seconds)
                SELECT h.id, v.youtube_id, p.\`key\`, h.session_started_at, h.last_updated_at, h.time_watched_seconds
                FROM watch_history h
                INNER JOIN videos v
                    ON v.id = h.video_id
                INNER JOIN profiles p
                    ON p.id = h.profile_id
                ORDER BY h.id ASC
            `
        }
    ];
}

function buildShadowValidationSteps(counts: Record<string, number>): SqlStep[]
{
    return [
        {
            description: 'Validate stable source-channel row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_source_channels /* expected:${counts.source_channels} */`
        },
        {
            description: 'Validate stable video row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_videos /* expected:${counts.videos} */`
        },
        {
            description: 'Validate stable virtual-channel row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_virtual_channels /* expected:${counts.virtual_channels} */`
        },
        {
            description: 'Validate stable assignment row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_virtual_channel_assignments /* expected:${counts.virtual_channel_assignments} */`
        },
        {
            description: 'Validate stable assignment-selection row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_virtual_channel_assignment_video_selections /* expected:${counts.virtual_channel_assignment_video_selections} */`
        },
        {
            description: 'Validate stable profile row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_profiles /* expected:${counts.profiles} */`
        },
        {
            description: 'Validate stable video-flag row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_video_flags /* expected:${counts.video_flags} */`
        },
        {
            description: 'Validate stable watch-history row count',
            sql: `SELECT COUNT(*) AS total_count FROM __stable_watch_history /* expected:${counts.watch_history} */`
        }
    ];
}

function buildSwapAndFinalizeSteps(): SqlStep[]
{
    const renameSql = `
        RENAME TABLE
            source_channels TO legacy_source_channels,
            videos TO legacy_videos,
            virtual_channels TO legacy_virtual_channels,
            virtual_channel_assignments TO legacy_virtual_channel_assignments,
            virtual_channel_assignment_video_selections TO legacy_virtual_channel_assignment_video_selections,
            profiles TO legacy_profiles,
            video_flags TO legacy_video_flags,
            watch_history TO legacy_watch_history,
            __stable_source_channels TO source_channels,
            __stable_videos TO videos,
            __stable_virtual_channels TO virtual_channels,
            __stable_virtual_channel_assignments TO virtual_channel_assignments,
            __stable_virtual_channel_assignment_video_selections TO virtual_channel_assignment_video_selections,
            __stable_profiles TO profiles,
            __stable_video_flags TO video_flags,
            __stable_watch_history TO watch_history
    `;
    const indexSteps = splitStatements(CREATE_INDEXES).map((sql, index) => ({
        description: `Apply stable index ${index + 1}`,
        sql
    }));

    return [
        {
            description: 'Disable foreign-key checks for atomic table swap',
            sql: 'SET FOREIGN_KEY_CHECKS = 0'
        },
        {
            description: 'Swap stable-id shadow tables into the live table names and preserve legacy backups',
            sql: renameSql
        },
        ...indexSteps,
        ...SHADOW_FOREIGN_KEY_STEPS,
        {
            description: 'Record the stable-id migration marker in _meta',
            sql: `
                INSERT INTO _meta(\`key\`, value) VALUES('stable_id_migration_applied_at', ?)
                ON DUPLICATE KEY UPDATE value=VALUES(value)
            `,
            values: [String(Date.now())]
        },
        {
            description: 'Record the stable-id migration layout marker in _meta',
            sql: `
                INSERT INTO _meta(\`key\`, value) VALUES('stable_id_migration_layout', 'stable_ids_v1')
                ON DUPLICATE KEY UPDATE value=VALUES(value)
            `
        },
        {
            description: 'Re-enable foreign-key checks after the stable-id table swap',
            sql: 'SET FOREIGN_KEY_CHECKS = 1'
        }
    ];
}

export function buildStableIdMigrationPlan(
    counts: Record<string, number>,
    virtualChannels: LegacyVirtualChannelRow[]
): StableIdMigrationPlan
{
    const mappings = buildStableVirtualChannelIdMappings(virtualChannels);
    const steps = [
        ...buildShadowCreateSteps(),
        ...buildShadowLoadSteps(mappings),
        ...buildShadowValidationSteps(counts),
        ...buildSwapAndFinalizeSteps()
    ];

    return {
        counts,
        mappings,
        steps
    };
}

function logStep(step: SqlStep): void
{
    console.log(`\n-- ${step.description}`);
    console.log(step.sql.trim());

    if (step.values && step.values.length > 0) {
        console.log(`-- values: ${JSON.stringify(step.values)}`);
    }
}

async function validateShadowCounts(pool: DatabaseClientProvider, counts: Record<string, number>): Promise<void>
{
    const shadowChecks = [
        { tableName: '__stable_source_channels', expected: counts.source_channels },
        { tableName: '__stable_videos', expected: counts.videos },
        { tableName: '__stable_virtual_channels', expected: counts.virtual_channels },
        { tableName: '__stable_virtual_channel_assignments', expected: counts.virtual_channel_assignments },
        { tableName: '__stable_virtual_channel_assignment_video_selections', expected: counts.virtual_channel_assignment_video_selections },
        { tableName: '__stable_profiles', expected: counts.profiles },
        { tableName: '__stable_video_flags', expected: counts.video_flags },
        { tableName: '__stable_watch_history', expected: counts.watch_history }
    ] as const;

    for (const check of shadowChecks) {
        const result = await pool.query<{ total_count: number }>(`SELECT COUNT(*) AS total_count FROM ${check.tableName}`);
        const actual = result.rows[0]?.total_count ?? 0;

        if (actual !== check.expected) {
            throw new Error(`Stable-id migration validation failed for ${check.tableName}: expected ${check.expected}, got ${actual}.`);
        }
    }
}

export async function runStableIdMigrationWorkflow(options: {
    pool: DatabaseClientProvider;
    apply: boolean;
}): Promise<StableIdMigrationResult>
{
    await assertLegacySchemaShape(options.pool);
    await assertNoPreexistingMigrationArtifacts(options.pool);
    await assertLegacyNaturalKeyIntegrity(options.pool);

    const counts = await loadLegacyCounts(options.pool);
    const virtualChannels = await loadLegacyVirtualChannels(options.pool);
    const plan = buildStableIdMigrationPlan(counts, virtualChannels);

    if (!options.apply) {
        return {
            ...plan,
            applied: false
        };
    }

    let foreignKeyChecksDisabled = false;
    const swapStartIndex = plan.steps.findIndex((step) => step.sql === 'SET FOREIGN_KEY_CHECKS = 0');
    const preSwapSteps = swapStartIndex >= 0 ? plan.steps.slice(0, swapStartIndex) : plan.steps;
    const swapSteps = swapStartIndex >= 0 ? plan.steps.slice(swapStartIndex) : [];

    try {
        for (const step of preSwapSteps) {
            if (step.sql === 'SET FOREIGN_KEY_CHECKS = 0') {
                foreignKeyChecksDisabled = true;
            }

            await options.pool.query(step.sql, step.values || []);
        }

        await validateShadowCounts(options.pool, counts);

        for (const step of swapSteps) {
            if (step.sql === 'SET FOREIGN_KEY_CHECKS = 0') {
                foreignKeyChecksDisabled = true;
            }

            await options.pool.query(step.sql, step.values || []);
        }

        return {
            ...plan,
            applied: true
        };
    } catch (error) {
        if (foreignKeyChecksDisabled) {
            try {
                await options.pool.query('SET FOREIGN_KEY_CHECKS = 1');
            } catch {
                // Leave the original error intact; the operator can restore from backup if needed.
            }
        }

        throw error;
    }
}

async function main(): Promise<void>
{
    const { mode, apply } = parseArgs();
    const databaseUrl = requireDatabaseUrlForRuntime('Stable-id migration script', {
        allowMissingInTest: false,
    });
    const pool = new DatabasePool({ connectionString: databaseUrl });

    try {
        const result = await runStableIdMigrationWorkflow({
            pool,
            apply
        });

        console.log(`Database mode: ${mode}`);
        console.log('Database target: DATABASE_URL');
        console.log(`Legacy row counts: ${JSON.stringify(result.counts)}`);
        console.log(`Deterministic virtual channel mappings: ${JSON.stringify(result.mappings)}`);

        for (const step of result.steps) {
            logStep(step);
        }

        if (!apply) {
            console.log('\nDry run only. Re-run with --apply after verifying a backup and the generated SQL plan.');
            return;
        }

        console.log('\nStable-id migration applied. Legacy tables were preserved with the "legacy_" prefix for manual rollback.');
    } finally {
        await pool.close();
    }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const scriptPath = fileURLToPath(import.meta.url);

if (entryPath === scriptPath) {
    main().catch((err) => {
        console.error('Stable-id migration failed:', err?.message || err);
        exit(1);
    });
}
