// DDL statements for database schema (tables and indexes) and aggregated list.
// Note: This file intentionally contains only schema DDL, not database creation/connection code.

export const CREATE_TABLE_CHANNELS = `
CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT NULL,
    published_at INTEGER DEFAULT NULL
);`;

export const CREATE_TABLE_CHANNEL_GROUPS = `
CREATE TABLE IF NOT EXISTS channel_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);`;

export const CREATE_TABLE_GROUP_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS channel_group_assignments (
    channel_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (channel_id, group_id),
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES channel_groups(id) ON DELETE CASCADE
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
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);`;

export const CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
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

export const CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    watched_at INTEGER NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;

export const CREATE_INDEXES = `
-- Uniqueness on external IDs
CREATE UNIQUE INDEX IF NOT EXISTS uq_channels_youtube_id ON channels(youtube_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_youtube_id ON videos(youtube_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_key ON profiles(key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_group_name ON channel_groups(name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_flags_pk ON video_flags(video_id, profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_group_assignment_pk ON channel_group_assignments(channel_id, group_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_history_profile_time ON watch_history(profile_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_video_time ON watch_history(video_id, watched_at DESC);
`;

export const ALL_DDL = [
    CREATE_TABLE_CHANNELS,
    CREATE_TABLE_CHANNEL_GROUPS,
    CREATE_TABLE_GROUP_ASSIGNMENTS,
    CREATE_TABLE_VIDEOS,
    CREATE_TABLE_PROFILES,
    CREATE_TABLE_VIDEO_FLAGS,
    CREATE_TABLE_WATCH_HISTORY,
    CREATE_INDEXES
];
