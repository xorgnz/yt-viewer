// SQLite schema for YT Channel Watcher
// Task 1.1: Design schema for channels, channel groups, assignments, videos, profiles, flags, and watch history
// Note: Migrations/DDL execution is handled in later tasks (1.3). This file only defines the schema.

export const SCHEMA_VERSION = 1;

// Channels contain basic channel metadata
export const CREATE_TABLE_CHANNELS = `
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,                 -- YouTube channel ID
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT NULL,
  published_at INTEGER DEFAULT NULL    -- unix epoch ms
);
`;

// Channel groups for organizing channels by topics/audience
export const CREATE_TABLE_CHANNEL_GROUPS = `
CREATE TABLE IF NOT EXISTS channel_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
`;

// Many-to-many relationship between channels and groups
export const CREATE_TABLE_GROUP_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS channel_group_assignments (
  channel_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (channel_id, group_id),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES channel_groups(id) ON DELETE CASCADE
);
`;

// Videos for each channel
export const CREATE_TABLE_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,                 -- YouTube video ID
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  published_at INTEGER DEFAULT NULL,   -- unix epoch ms
  duration_seconds INTEGER DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
`;

// Profiles: although the app uses two hard-coded profiles, we persist them for preferences/history
export const CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                -- e.g., 'adult', 'child'
  name TEXT NOT NULL UNIQUE
);
`;

// Per-profile flags on videos: ignored, watched, favorite
export const CREATE_TABLE_VIDEO_FLAGS = `
CREATE TABLE IF NOT EXISTS video_flags (
  video_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  ignored INTEGER NOT NULL DEFAULT 0,   -- boolean 0/1
  watched INTEGER NOT NULL DEFAULT 0,   -- boolean 0/1
  favorite INTEGER NOT NULL DEFAULT 0,  -- boolean 0/1
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  PRIMARY KEY (video_id, profile_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
`;

// Watch history log
export const CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  watched_at INTEGER NOT NULL,          -- unix epoch ms
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
`;

// Helpful indexes
export const CREATE_INDEXES = `
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

export type Channel = {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  published_at?: number | null;
};

export type ChannelGroup = { id: number; name: string };
export type ChannelGroupAssignment = { channel_id: string; group_id: number };

export type Video = {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  published_at?: number | null;
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
};

export type Profile = { id: string; name: string };

export type VideoFlags = {
  video_id: string;
  profile_id: string;
  ignored: 0 | 1;
  watched: 0 | 1;
  favorite: 0 | 1;
  updated_at: number;
};

export type WatchHistory = {
  id: number;
  video_id: string;
  profile_id: string;
  watched_at: number;
};
