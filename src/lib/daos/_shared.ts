import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Schema versioning
export const SCHEMA_VERSION = 1;

// DDL
const CREATE_TABLE_CHANNELS = `
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,    -- YouTube channel ID
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT NULL,
  published_at INTEGER DEFAULT NULL
);`;

const CREATE_TABLE_CHANNEL_GROUPS = `
CREATE TABLE IF NOT EXISTS channel_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);`;

const CREATE_TABLE_GROUP_ASSIGNMENTS = `
CREATE TABLE IF NOT EXISTS channel_group_assignments (
  channel_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (channel_id, group_id),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES channel_groups(id) ON DELETE CASCADE
);`;

const CREATE_TABLE_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,    -- YouTube video ID
  channel_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  published_at INTEGER DEFAULT NULL,
  duration_seconds INTEGER DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);`;

const CREATE_TABLE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,            -- e.g., 'adult', 'child'
  name TEXT NOT NULL
);`;

const CREATE_TABLE_VIDEO_FLAGS = `
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

const CREATE_TABLE_WATCH_HISTORY = `
CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  watched_at INTEGER NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);`;

const CREATE_INDEXES = `
-- Uniqueness on external IDs
CREATE UNIQUE INDEX IF NOT EXISTS uq_channels_external_id ON channels(external_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_external_id ON videos(external_id);
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

// DB lifecycle
const DEFAULT_DB_DIR = process.env.YTCW_DB_DIR || '.data';
const DEFAULT_DB_FILE = process.env.YTCW_DB_FILE || 'app.db';
const dbPath = path.resolve(process.cwd(), DEFAULT_DB_DIR, DEFAULT_DB_FILE);
let dbInstance: Database.Database | null = null;

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createMetaTable(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
}

function getSchemaVersion(db: Database.Database): number | null {
  try {
    const row = db.prepare('SELECT value FROM _meta WHERE key = ?').get('schema_version') as { value: string } | undefined;
    return row ? Number(row.value) : null;
  } catch {
    return null;
  }
}

function setSchemaVersion(db: Database.Database, version: number) {
  db.prepare(`INSERT INTO _meta(key, value) VALUES('schema_version', ?) 
              ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(String(version));
}

function runAllDDL(db: Database.Database) {
  const tx = db.transaction(() => {
    for (const ddl of ALL_DDL) db.exec(ddl);
    setSchemaVersion(db, SCHEMA_VERSION);
  });
  tx();
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureDir(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  createMetaTable(db);
  const current = getSchemaVersion(db);
  if (current === null || current < SCHEMA_VERSION) runAllDDL(db);
  dbInstance = db;
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getDbPath() {
  return dbPath;
}
