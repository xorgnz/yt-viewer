# Stable ID Needs: Stable Database IDs

## Scope

This document identifies the stable identifier needs, composite-key candidates, and public/API/UI contracts currently exposing generated row IDs. It completes the task 1 audit and should feed the database change plan required by task 2.

## Entity Stable Identifier Needs

| Entity/table | Current generated ID dependency | Stable identifier need | Candidate stable source |
| --- | --- | --- | --- |
| `source_channels` | `id` is referenced by `videos.channel_id`, `virtual_channel_assignments.source_channel_id`, admin actions, and viewer/history channel filters. | A stable source-channel identifier that can be used by videos, assignments, filters, and admin operations. | `youtube_id`, because source channels are YouTube-backed and already unique. |
| `videos` | `id` is referenced by flags, watch history, selected-only review state, viewer bulk actions, admin review actions, and read models. | A stable video identifier that can be used by flags, history, selections, viewer actions, and admin actions. | `youtube_id`, because videos are YouTube-backed and already unique. |
| `profiles` | `id` is referenced by `video_flags.profile_id`, `watch_history.profile_id`, and profile-aware reader/service contracts. | A stable profile identifier for flags, history, and active-profile context. | `key`, because profile keys are natural, already unique, and cookie-facing. |
| `virtual_channels` | `id` is referenced by assignments, admin route params/forms, viewer `groupId`, and virtual-channel links. | A stable virtual-channel identifier for assignment references, admin operations, and viewer group filters. | A deterministic value derived from `name`, unless task 2 chooses a separate immutable slug to avoid rename coupling. |
| `virtual_channel_assignments` | `id` is referenced by selected-only review state and admin assignment-mode/review actions. | A stable way to identify an assignment without relying on a generated row ID. | Composite identity of stable source-channel ID plus stable virtual-channel ID. |
| `virtual_channel_assignment_video_selections` | `id` is not externally referenced, but `assignment_id` and `video_id` are generated row-ID references. | A stable identity for selected-only review state. | Composite identity of assignment stable tuple plus stable video ID. |
| `video_flags` | Primary key is generated `video_id` plus generated `profile_id`. | A stable per-video/profile state key. | Composite identity of stable video ID plus stable profile ID. |
| `watch_history` | `video_id` and `profile_id` are generated references; `id` is used as internal session update key. | Stable video/profile references while preserving a per-session implementation key. | Stable video ID plus stable profile ID; session `id` may remain private/internal. |
| `migration_history` | Has generated `id`, but no app data relationships depend on it. | No feature-driven relationship stable ID need. | Keep as internal migration bookkeeping unless task 2 elects otherwise. |
| `_meta` | Uses string key primary key. | No change needed for stable-ID goals. | Existing `key`. |

## Composite Key Candidates

| Table | Candidate composite key | Reason |
| --- | --- | --- |
| `virtual_channel_assignments` | `source_channel_stable_id, virtual_channel_stable_id` | The current unique row identity is already the source/virtual-channel pair; a standalone assignment ID is not needed for the relationship contract. |
| `virtual_channel_assignment_video_selections` | `source_channel_stable_id, virtual_channel_stable_id, video_stable_id` or `assignment stable tuple + video_stable_id` | The row represents review state for one video under one assignment. The current generated `assignment_id, video_id` tuple should become a stable tuple. |
| `video_flags` | `video_stable_id, profile_stable_id` | The row represents one profile's state for one video, and the current primary key is already a generated-ID version of that tuple. |
| `watch_history` lookup indexes | `profile_stable_id, session_started_at`; `video_stable_id, session_started_at`; `video_stable_id, profile_stable_id, last_updated_at` | The session row itself can keep an implementation key, but all relationship lookups should use stable video/profile identifiers. |

## Public, API, and UI Contracts Exposing Generated IDs

| Contract surface | Current exposed generated IDs | Stable-ID implication |
| --- | --- | --- |
| Viewer query string | `channelId` uses generated source-channel ID; `groupId` uses generated virtual-channel ID. | Query parsing and links need stable channel/group identifiers or renamed parameters that make the stable contract explicit. |
| Viewer page actions | `videoId` and `videoIds` form fields submit generated video IDs for toggle, bulk update, undo, and restore. | Viewer actions should submit stable video identifiers; undo/restore JSON payloads should store stable video identifiers. |
| Viewer watch page | Watch route path uses YouTube video ID, but toggle form submits generated `data.video.id`; channel link uses generated `channel_id`. | Watch flow already has a stable route identifier for the video, but flag forms and channel links need stable IDs. |
| History page | `channelId` filter, channel links, returned `video_id`, `profile_id`, and `channel_id` expose generated IDs. | History filters and grouping should move to stable channel/video/profile identifiers while preserving display behavior. |
| Admin source-channel page | Hidden `id` fields submit generated source-channel IDs for update, delete, and refresh. | Admin source-channel actions should target stable source-channel IDs, likely YouTube channel IDs. |
| Admin virtual-channel index | Hidden `id`, `virtual_channel_id`, and `source_channel_id` fields submit generated virtual/source-channel IDs. | Admin index actions should target stable virtual-channel and source-channel IDs. |
| Admin virtual-channel manage route | Route param `[virtualChannelId]` is a generated virtual-channel ID. | Route contract needs a stable virtual-channel identifier; if name-derived, task 2 must address rename behavior. |
| Admin virtual-channel manage forms | Hidden `assignment_id`, `video_id`, and `video_ids` fields submit generated assignment/video IDs; add association uses generated `source_channel_id`. | Assignment actions need stable assignment tuple fields or one approved derived assignment key; review actions need stable video IDs. |
| Import service return value | `ImportResult.channelId` returns generated source-channel ID. | Import result should return stable source-channel ID or avoid exposing a relationship row ID. |
| Server profile context | Exposes `activeProfileId` generated ID after resolving the stable cookie profile key. | Services/readers should use the stable profile key instead of generated profile ID. |
| TypeScript entity/view models | `id`, `channel_id`, `profile_id`, `assignment_id`, and `video_id` are typed as numbers across entities, readers, services, and page data. | Return types and DTOs need stable string IDs or explicitly private generated IDs where retained internally. |
| Tests | Query parser/spec/action/parser/page-state tests assert numeric generated IDs and generated-ID SQL joins. | Tests need to shift to stable string IDs and composite-key SQL contracts after task 2 approval. |

## Stable Identifier Design Questions for Task 2

| Area | Decision needed |
| --- | --- |
| Virtual-channel stability | Whether `virtual_channels.name` itself is the stable ID, or whether to add a derived immutable slug/key so renaming does not change relationships or URLs. |
| Assignment identity transport | Whether selected-only admin actions should submit the full stable tuple (`source_channel_id` plus `virtual_channel_id`) or a derived assignment stable key. The PRD preference points to tuple identity. |
| Selection identity shape | Whether selection rows should store both assignment stable columns plus video stable ID, or reference an assignment composite key through foreign keys if supported cleanly by MySQL/MariaDB DDL. |
| Private generated IDs | Which generated IDs, if any, remain as private implementation keys. Strong candidates are `watch_history.id` and `migration_history.id`; assignment/selection row IDs should not remain part of app contracts. |
| Naming convention | Whether existing column names such as `channel_id`, `video_id`, and `profile_id` will become stable string IDs in place, or whether new explicit names like `channel_youtube_id`, `video_youtube_id`, and `profile_key` will be used during migration. |

## Summary

The database change plan should eliminate generated row IDs from relationship contracts by using:

- YouTube-derived stable IDs for `source_channels` and `videos`.
- Natural profile keys for `profiles`.
- An approved stable key for `virtual_channels`.
- Composite stable keys for assignments, selections, and flags.
- Stable video/profile references for watch history while allowing an internal session key.

The highest-risk exposed contracts are viewer/admin form fields, viewer/history query strings, admin virtual-channel route params, reader return models, and tests that currently assume numeric generated IDs.
