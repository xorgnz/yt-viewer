// DDL statements for database schema (tables and indexes) and aggregated list.
// Note: This file intentionally contains only schema DDL, not database creation/connection code.

// Schema version
export const SCHEMA_VERSION = 8;


export const CREATE_TABLE_SOURCE_CHANNELS = `
CREATE TABLE IF NOT EXISTS source_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT NULL,
    published_at INTEGER DEFAULT NULL,
    last_refreshed_at INTEGER DEFAULT NULL
);`;


export const MYSQL_CREATE_TABLE_SOURCE_CHANNELS = `
CREATE TABLE IF NOT EXISTS source_channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    youtube_id VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    published_at BIGINT DEFAULT NULL,
    last_refreshed_at BIGINT DEFAULT NULL
);`;

export const CREATE_TABLE_VIRTUAL_CHANNELS = `
CREATE TABLE IF NOT EXISTS virtual_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);`;


export const MYSQL_CREATE_TABLE_VIRTUAL_CHANNELS = `
CREATE TABLE IF NOT EXISTS virtual_channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);`;

export const CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_channel_id INTEGER NOT NULL,
    virtual_channel_id INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'all',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    CHECK (mode IN ('all', 'long_only', 'selected_only')),
    FOREIGN KEY (source_channel_id) REFERENCES source_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (virtual_channel_id) REFERENCES virtual_channels(id) ON DELETE CASCADE,
    UNIQUE (source_channel_id, virtual_channel_id)
);`;


export const MYSQL_CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_channel_id INT NOT NULL,
    virtual_channel_id INT NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'all',
    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    CHECK (mode IN ('all', 'long_only', 'selected_only')),
    FOREIGN KEY (source_channel_id) REFERENCES source_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (virtual_channel_id) REFERENCES virtual_channels(id) ON DELETE CASCADE,
    UNIQUE (source_channel_id, virtual_channel_id)
);`;

export const CREATE_TABLE_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_id TEXT NOT NULL UNIQUE,
    channel_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    published_at INTEGER DEFAULT NULL,
    duration_seconds INTEGER DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    length_classification TEXT DEFAULT 'unknown',
    CHECK (length_classification IN ('long', 'short', 'unknown')),
    FOREIGN KEY (channel_id) REFERENCES source_channels(id) ON DELETE CASCADE
);`;


export const MYSQL_CREATE_TABLE_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    youtube_id VARCHAR(255) NOT NULL UNIQUE,
    channel_id INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    published_at BIGINT DEFAULT NULL,
    duration_seconds INT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    length_classification VARCHAR(32) DEFAULT 'unknown',
    CHECK (length_classification IN ('long', 'short', 'unknown')),
    FOREIGN KEY (channel_id) REFERENCES source_channels(id) ON DELETE CASCADE
);`;

export const CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignment_video_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    review_state TEXT NOT NULL DEFAULT 'not_yet_reviewed',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    CHECK (review_state IN ('included', 'ignored', 'not_yet_reviewed')),
    FOREIGN KEY (assignment_id) REFERENCES virtual_channel_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE (assignment_id, video_id)
);`;


export const MYSQL_CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignment_video_selections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    video_id INT NOT NULL,
    review_state VARCHAR(32) NOT NULL DEFAULT 'not_yet_reviewed',
    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    CHECK (review_state IN ('included', 'ignored', 'not_yet_reviewed')),
    FOREIGN KEY (assignment_id) REFERENCES virtual_channel_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE (assignment_id, video_id)
);`;

export const CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);`;


export const MYSQL_CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    name TEXT NOT NULL
);`;

export const CREATE_TABLE_VIDEO_FLAGS = `
CREATE TABLE IF NOT EXISTS video_flags (
    video_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    ignored INTEGER NOT NULL DEFAULT 0,
    watched INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    PRIMARY KEY (video_id, profile_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;


export const MYSQL_CREATE_TABLE_VIDEO_FLAGS = `
CREATE TABLE IF NOT EXISTS video_flags (
    video_id INT NOT NULL,
    profile_id INT NOT NULL,
    ignored TINYINT NOT NULL DEFAULT 0,
    watched TINYINT NOT NULL DEFAULT 0,
    favorite TINYINT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    PRIMARY KEY (video_id, profile_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;

export const DROP_TABLE_WATCH_HISTORY = `
DROP TABLE IF EXISTS watch_history;`;

export const CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    session_started_at INTEGER NOT NULL,
    last_updated_at INTEGER NOT NULL,
    time_watched_seconds INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;


export const MYSQL_CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    profile_id INT NOT NULL,
    session_started_at BIGINT NOT NULL,
    last_updated_at BIGINT NOT NULL,
    time_watched_seconds INT NOT NULL DEFAULT 0,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;

export const CREATE_TABLE_MIGRATION_HISTORY = `
CREATE TABLE IF NOT EXISTS migration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    applied_at INTEGER DEFAULT NULL,
    success INTEGER NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT NULL
);`;


export const MYSQL_CREATE_TABLE_MIGRATION_HISTORY = `
CREATE TABLE IF NOT EXISTS migration_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    started_at BIGINT NOT NULL,
    applied_at BIGINT DEFAULT NULL,
    success TINYINT NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT NULL
);`;


export const MYSQL_CREATE_TABLE_META = `
CREATE TABLE IF NOT EXISTS _meta (
    \`key\` VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL
);`;

export const CREATE_INDEXES = `
-- Uniqueness on external IDs
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_channels_youtube_id ON source_channels(youtube_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_youtube_id ON videos(youtube_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_key ON profiles(key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_virtual_channels_name ON virtual_channels(name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_flags_pk ON video_flags(video_id, profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_virtual_channel_assignment_pair ON virtual_channel_assignments(source_channel_id, virtual_channel_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_virtual_channel_assignment_video_selection_pair ON virtual_channel_assignment_video_selections(assignment_id, video_id);
CREATE INDEX IF NOT EXISTS idx_virtual_channel_assignments_virtual_channel ON virtual_channel_assignments(virtual_channel_id);
CREATE INDEX IF NOT EXISTS idx_virtual_channel_assignments_source_channel ON virtual_channel_assignments(source_channel_id);
CREATE INDEX IF NOT EXISTS idx_virtual_channel_assignment_video_selections_assignment ON virtual_channel_assignment_video_selections(assignment_id);
CREATE INDEX IF NOT EXISTS idx_virtual_channel_assignment_video_selections_video ON virtual_channel_assignment_video_selections(video_id);
CREATE INDEX IF NOT EXISTS idx_virtual_channel_assignment_video_selections_state ON virtual_channel_assignment_video_selections(review_state);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_history_profile_time ON watch_history(profile_id, session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_video_time ON watch_history(video_id, session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_video_profile_update ON watch_history(video_id, profile_id, last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON migration_history(version);
`;


export const MYSQL_ALL_DDL = [
    MYSQL_CREATE_TABLE_SOURCE_CHANNELS,
    MYSQL_CREATE_TABLE_VIRTUAL_CHANNELS,
    MYSQL_CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS,
    MYSQL_CREATE_TABLE_VIDEOS,
    MYSQL_CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS,
    MYSQL_CREATE_TABLE_PROFILES,
    MYSQL_CREATE_TABLE_VIDEO_FLAGS,
    DROP_TABLE_WATCH_HISTORY,
    MYSQL_CREATE_TABLE_WATCH_HISTORY,
    MYSQL_CREATE_TABLE_MIGRATION_HISTORY,
    CREATE_INDEXES
];

export const ALL_DDL = [
    CREATE_TABLE_SOURCE_CHANNELS,
    CREATE_TABLE_VIRTUAL_CHANNELS,
    CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS,
    CREATE_TABLE_VIDEOS,
    CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS,
    CREATE_TABLE_PROFILES,
    CREATE_TABLE_VIDEO_FLAGS,
    DROP_TABLE_WATCH_HISTORY,
    CREATE_TABLE_WATCH_HISTORY,
    CREATE_TABLE_MIGRATION_HISTORY,
    CREATE_INDEXES
];
// apply-patch-anchor - do not delete


