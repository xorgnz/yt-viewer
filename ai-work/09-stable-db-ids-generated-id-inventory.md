# Generated ID Inventory: Stable Database IDs

## Scope

This inventory covers the current schema in `src/lib/daos/_schema.ts` at schema version 8. It lists every auto-increment primary key and every foreign key column that currently references a generated row ID.

## Auto-Increment Primary Keys

| Table | Column | Current role | Stable-ID relevance |
| --- | --- | --- | --- |
| `source_channels` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated source-channel row ID. | Currently referenced by `videos.channel_id` and `virtual_channel_assignments.source_channel_id`; YouTube-backed stable candidate is `source_channels.youtube_id`. |
| `virtual_channels` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated virtual-channel row ID. | Currently referenced by `virtual_channel_assignments.virtual_channel_id`; natural-key stable candidate is `virtual_channels.name` or a derived value from it. |
| `virtual_channel_assignments` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated assignment row ID. | Currently referenced by `virtual_channel_assignment_video_selections.assignment_id`; the row already has a unique tuple on `source_channel_id, virtual_channel_id`. |
| `videos` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated video row ID. | Currently referenced by `virtual_channel_assignment_video_selections.video_id`, `video_flags.video_id`, and `watch_history.video_id`; YouTube-backed stable candidate is `videos.youtube_id`. |
| `virtual_channel_assignment_video_selections` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated selection row ID. | Not referenced by foreign keys; the row already has a unique tuple on `assignment_id, video_id`. |
| `profiles` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated profile row ID. | Currently referenced by `video_flags.profile_id` and `watch_history.profile_id`; natural-key stable candidate is `profiles.key`. |
| `watch_history` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated watch-session row ID. | Not referenced by foreign keys; may remain as an internal session identity because a session is not uniquely defined by video/profile alone. |
| `migration_history` | `id INT AUTO_INCREMENT PRIMARY KEY` | Generated migration-run row ID. | Internal migration bookkeeping; no application relationship depends on it. |

## Generated Row-ID Foreign Keys

| Table | Column | References | Current relationship |
| --- | --- | --- | --- |
| `virtual_channel_assignments` | `source_channel_id INT NOT NULL` | `source_channels(id)` | Assignment targets a source channel by generated source-channel row ID. |
| `virtual_channel_assignments` | `virtual_channel_id INT NOT NULL` | `virtual_channels(id)` | Assignment targets a virtual channel by generated virtual-channel row ID. |
| `videos` | `channel_id INT NOT NULL` | `source_channels(id)` | Video belongs to a source channel by generated source-channel row ID. |
| `virtual_channel_assignment_video_selections` | `assignment_id INT NOT NULL` | `virtual_channel_assignments(id)` | Selection belongs to an assignment by generated assignment row ID. |
| `virtual_channel_assignment_video_selections` | `video_id INT NOT NULL` | `videos(id)` | Selection targets a video by generated video row ID. |
| `video_flags` | `video_id INT NOT NULL` | `videos(id)` | Per-profile flag state targets a video by generated video row ID. |
| `video_flags` | `profile_id INT NOT NULL` | `profiles(id)` | Per-video flag state targets a profile by generated profile row ID. |
| `watch_history` | `video_id INT NOT NULL` | `videos(id)` | Watch session targets a video by generated video row ID. |
| `watch_history` | `profile_id INT NOT NULL` | `profiles(id)` | Watch session targets a profile by generated profile row ID. |

## Composite Keys and Indexes Using Generated Row IDs

| Table/index or constraint | Columns | Current role |
| --- | --- | --- |
| `virtual_channel_assignments UNIQUE` | `source_channel_id, virtual_channel_id` | Prevents duplicate source/virtual assignment pairs using generated row IDs. |
| `video_flags PRIMARY KEY` | `video_id, profile_id` | Identifies one flag row per generated video/profile row ID pair. |
| `virtual_channel_assignment_video_selections UNIQUE` | `assignment_id, video_id` | Prevents duplicate assignment/video selection rows using generated row IDs. |
| `uq_video_flags_pk` | `video_id, profile_id` | Duplicates the `video_flags` generated row-ID primary key as an explicit unique index. |
| `uq_virtual_channel_assignment_pair` | `source_channel_id, virtual_channel_id` | Mirrors the assignment tuple uniqueness using generated row IDs. |
| `uq_virtual_channel_assignment_video_selection_pair` | `assignment_id, video_id` | Mirrors the selection tuple uniqueness using generated row IDs. |
| `idx_virtual_channel_assignments_virtual_channel` | `virtual_channel_id` | Lookup index over generated virtual-channel row ID. |
| `idx_virtual_channel_assignments_source_channel` | `source_channel_id` | Lookup index over generated source-channel row ID. |
| `idx_virtual_channel_assignment_video_selections_assignment` | `assignment_id` | Lookup index over generated assignment row ID. |
| `idx_virtual_channel_assignment_video_selections_video` | `video_id` | Lookup index over generated video row ID. |
| `idx_videos_channel` | `channel_id` | Lookup index over generated source-channel row ID. |
| `idx_history_profile_time` | `profile_id, session_started_at DESC` | Watch-history lookup index over generated profile row ID. |
| `idx_history_video_time` | `video_id, session_started_at DESC` | Watch-history lookup index over generated video row ID. |
| `idx_history_video_profile_update` | `video_id, profile_id, last_updated_at DESC` | Watch-history lookup index over generated video/profile row ID pair. |

## Tables Without Generated Row-ID Relationships

| Table | Note |
| --- | --- |
| `_meta` | Uses `key VARCHAR(255) PRIMARY KEY`; no generated row ID. |
| `migration_history` | Has a generated primary key, but no foreign keys reference it and it does not reference application data. |
