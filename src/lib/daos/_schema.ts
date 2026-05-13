// DDL statements for database schema and aggregated list.
// Note: This file intentionally contains only schema DDL, not database creation/connection code.

export const SCHEMA_VERSION = 9;

export const CREATE_TABLE_SOURCE_CHANNELS = `
CREATE TABLE IF NOT EXISTS source_channels (
    src_channel_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    published_at BIGINT DEFAULT NULL,
    last_refreshed_at BIGINT DEFAULT NULL,
    PRIMARY KEY (src_channel_id)
);`;

export const CREATE_TABLE_VIRTUAL_CHANNELS = `
CREATE TABLE IF NOT EXISTS virtual_channels (
    vchannel_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    daily_timer_max INT DEFAULT NULL,
    PRIMARY KEY (vchannel_id)
);`;

export const CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignments (
    src_channel_id VARCHAR(255) NOT NULL,
    vchannel_id VARCHAR(255) NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'all',
    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    PRIMARY KEY (src_channel_id, vchannel_id),
    CHECK (mode IN ('all', 'long_only', 'selected_only')),
    FOREIGN KEY (src_channel_id) REFERENCES source_channels(src_channel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (vchannel_id) REFERENCES virtual_channels(vchannel_id) ON DELETE CASCADE ON UPDATE CASCADE
);`;

export const CREATE_TABLE_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
    video_id VARCHAR(255) NOT NULL,
    src_channel_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    published_at BIGINT DEFAULT NULL,
    duration_seconds INT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    length_classification VARCHAR(32) DEFAULT 'unknown',
    PRIMARY KEY (video_id),
    CHECK (length_classification IN ('long', 'short', 'unknown')),
    FOREIGN KEY (src_channel_id) REFERENCES source_channels(src_channel_id) ON DELETE CASCADE ON UPDATE CASCADE
);`;

export const CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS = `
CREATE TABLE IF NOT EXISTS virtual_channel_assignment_video_selections (
    src_channel_id VARCHAR(255) NOT NULL,
    vchannel_id VARCHAR(255) NOT NULL,
    video_id VARCHAR(255) NOT NULL,
    review_state VARCHAR(32) NOT NULL DEFAULT 'not_yet_reviewed',
    created_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    PRIMARY KEY (src_channel_id, vchannel_id, video_id),
    CHECK (review_state IN ('included', 'ignored', 'not_yet_reviewed')),
    FOREIGN KEY (src_channel_id, vchannel_id) REFERENCES virtual_channel_assignments(src_channel_id, vchannel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE
);`;

export const CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
    profile_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (profile_id)
);`;

export const CREATE_TABLE_VIDEO_FLAGS = `
CREATE TABLE IF NOT EXISTS video_flags (
    video_id VARCHAR(255) NOT NULL,
    profile_id VARCHAR(255) NOT NULL,
    ignored TINYINT NOT NULL DEFAULT 0,
    watched TINYINT NOT NULL DEFAULT 0,
    favorite TINYINT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
    PRIMARY KEY (video_id, profile_id),
    FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE ON UPDATE CASCADE
);`;

export const CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL,
    profile_id VARCHAR(255) NOT NULL,
    session_started_at BIGINT NOT NULL,
    last_updated_at BIGINT NOT NULL,
    time_watched_seconds INT NOT NULL DEFAULT 0,
    FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE ON UPDATE CASCADE
);`;

export const CREATE_TABLE_MIGRATION_HISTORY = `
CREATE TABLE IF NOT EXISTS migration_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    started_at BIGINT NOT NULL,
    applied_at BIGINT DEFAULT NULL,
    success TINYINT NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT NULL
);`;

export const CREATE_TABLE_META = `
CREATE TABLE IF NOT EXISTS _meta (
    \`key\` VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL
);`;

export const CREATE_INDEXES = `
CREATE UNIQUE INDEX IF NOT EXISTS uq_virtual_channels_name ON virtual_channels(name);
CREATE INDEX IF NOT EXISTS idx_vca_vchannel ON virtual_channel_assignments(vchannel_id);
CREATE INDEX IF NOT EXISTS idx_vcavs_video ON virtual_channel_assignment_video_selections(video_id);
CREATE INDEX IF NOT EXISTS idx_vcavs_state ON virtual_channel_assignment_video_selections(review_state);
CREATE INDEX IF NOT EXISTS idx_videos_src_channel ON videos(src_channel_id);
CREATE INDEX IF NOT EXISTS idx_history_profile ON watch_history(profile_id, session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_video ON watch_history(video_id, session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_video_profile_update ON watch_history(video_id, profile_id, last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON migration_history(version);
`;

export const ALL_DDL = [
    CREATE_TABLE_SOURCE_CHANNELS,
    CREATE_TABLE_VIRTUAL_CHANNELS,
    CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENTS,
    CREATE_TABLE_VIDEOS,
    CREATE_TABLE_VIRTUAL_CHANNEL_ASSIGNMENT_VIDEO_SELECTIONS,
    CREATE_TABLE_PROFILES,
    CREATE_TABLE_VIDEO_FLAGS,
    CREATE_TABLE_WATCH_HISTORY,
    CREATE_TABLE_MIGRATION_HISTORY,
    CREATE_INDEXES,
];
// apply-patch-anchor - do not delete
