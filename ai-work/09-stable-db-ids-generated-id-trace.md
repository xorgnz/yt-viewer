# Generated ID Trace: Stable Database IDs

## Scope

This trace covers DAO, reader, service, route, importer, UI form/link, and test paths that currently pass generated row IDs between entities. It builds on `ai-work/09-stable-db-ids-generated-id-inventory.md`.

## Entity Contracts

| Entity file | Generated ID contract |
| --- | --- |
| `src/lib/entities/sourceChannel.ts` | `SourceChannel.id` is the generated source-channel row ID returned to services/routes; comments identify it as the internal DB ID. |
| `src/lib/entities/video.ts` | `Video.id` is the generated video row ID; `Video.channel_id` is the generated source-channel row ID. |
| `src/lib/entities/profile.ts` | `Profile.id` is the generated profile row ID used by profile-aware flags/history reads and writes. |
| `src/lib/entities/virtualChannel.ts` | `VirtualChannel.id` is the generated virtual-channel row ID used by admin routes and viewer group filters. |
| `src/lib/entities/virtualChannelAssignment.ts` | `VirtualChannelAssignment.id` is the generated assignment row ID; `source_channel_id` and `virtual_channel_id` are generated row-ID references. |
| `src/lib/entities/virtualChannelAssignmentVideoSelection.ts` | `id` is a generated selection row ID; `assignment_id` and `video_id` are generated row-ID references. |
| `src/lib/entities/videoFlags.ts` | `video_id` and `profile_id` are generated video/profile row-ID references. |
| `src/lib/entities/watchHistory.ts` | `id` is a generated watch-session row ID; `video_id` and `profile_id` are generated row-ID references. |

## DAO Paths

| DAO | Generated ID handoff |
| --- | --- |
| `src/lib/daos/sourceChannelDAO.ts` | `get(id)`, `remove(id)`, and `markRefreshed(id)` accept generated source-channel IDs; `list()` and `listWithVideoStats()` return `sc.id`; stats join `videos.channel_id = source_channels.id` and aggregate flags by generated `video_id`. |
| `src/lib/daos/videoDAO.ts` | `upsert(video)` writes `channel_id`; `get(id)`, `remove(id)`, and `listExistingIds(ids)` accept generated video IDs; `listByChannel(channel_id)` filters by generated source-channel ID. |
| `src/lib/daos/profileDAO.ts` | `getByKey()` resolves a stable profile key to generated `profiles.id`; `list()` returns generated profile IDs. |
| `src/lib/daos/virtualChannelDAO.ts` | `create()` returns generated virtual-channel ID; `get(id)`, `rename(id)`, and `remove(id)` accept generated virtual-channel IDs; `list()` exposes them to admin/viewer routes. |
| `src/lib/daos/assignmentDAO.ts` | `add(source_channel_id, virtual_channel_id)` and `remove(source_channel_id, virtual_channel_id)` persist generated source/virtual-channel IDs; `updateMode(id)` and `get(id)` use generated assignment ID; list methods filter by generated source/virtual-channel IDs. |
| `src/lib/daos/virtualChannelAssignmentVideoSelectionDAO.ts` | `setReviewState(assignment_id, video_id)`, `remove()`, `get()`, and `listForAssignment()` use generated assignment/video IDs. |
| `src/lib/daos/flagsDAO.ts` | All reads/writes key flags by generated `video_id` and `profile_id`; bulk APIs return maps keyed by generated video IDs. |
| `src/lib/daos/historyDAO.ts` | `createSession()` writes generated `video_id` and `profile_id`; `findMostRecentSession(video_id, profile_id)` searches by generated references; `updateSessionProgress(id)` updates by generated session ID; `listByProfile(profile_id)` filters by generated profile ID. |

## Reader and Query Paths

| Reader/query file | Generated ID handoff |
| --- | --- |
| `src/lib/daos/readers/ViewerVideoReadRepository.ts` | Returns `v.id` and `v.channel_id`; joins `source_channels` with `c.id = v.channel_id`; joins flags with `vf.video_id = v.id` and generated `profileId`; adjacent navigation uses generated `v.id` as the same-published-at tiebreaker and exclusion key. |
| `src/lib/daos/queries/ViewerVideoQuerySpec.ts` | `channelId` filters `v.channel_id`; `groupId` filters `virtual_channel_assignments.virtual_channel_id`; group joins compare `ga.source_channel_id = v.channel_id`; selected-only joins compare generated `gavs.assignment_id = ga.id` and `gavs.video_id = v.id`. |
| `src/lib/daos/readers/HistoryReadRepository.ts` | Returns `h.profile_id`, `v.id AS video_id`, and `c.id AS channel_id`; joins history to videos by `v.id = h.video_id` and videos to source channels by `c.id = v.channel_id`. |
| `src/lib/daos/queries/HistoryReadQuerySpec.ts` | `profileId` filters `h.profile_id`; `channelId` filters `v.channel_id`. |

## Import Paths

| Import file | Generated ID handoff |
| --- | --- |
| `src/lib/youtube/importer.ts` | Imports source channel by YouTube ID, then re-reads it with `getByExternalId()` to obtain generated `sourceChannel.id`; passes that generated ID into `YouTubeVideoUpsertMapper.toVideoUpsert()` and returns it as `ImportResult.channelId`. |
| `src/lib/youtube/mapper.ts` | `YouTubeVideoUpsertMapper.toVideoUpsert(item, channelId, ...)` maps the generated source-channel ID into `videos.channel_id`; YouTube video/channel IDs remain available as `youtube_id` but are not the relationship key. |

## Viewer Service and Route Paths

| Path | Generated ID handoff |
| --- | --- |
| `src/lib/server/ServerProfileContext.ts` | Resolves profile key from cookie, then exposes generated `activeProfileId` to viewer/history services. |
| `src/lib/server/viewer/ViewerLoadService.ts` and `ViewerPageLoader.ts` | Parse viewer filters with generated `channelId` and `groupId`; pass generated `activeProfileId` into viewer readers; return generated profile/channel/group/video IDs in page data. |
| `src/lib/server/viewer/ViewerQueryParser.ts` | Parses `channelId` and `groupId` query params as numbers, currently generated source-channel and virtual-channel IDs. |
| `src/lib/server/viewer/ViewerActionParser.ts` | Parses `videoId` and `videoIds` form fields as positive integers, currently generated video IDs, and preserves them in undo/restore state payloads. |
| `src/lib/server/viewer/ViewerFlagService.ts` | Accepts generated `videoId` and `profileId`; checks existence with `VideoDAO.listExistingIds()`; writes flags through generated video/profile IDs; returns generated succeeded/failed/skipped video ID arrays. |
| `src/lib/server/viewer/ViewerWatchService.ts` | Public watch route uses YouTube ID, then resolves `ViewerVideoRecord.id` and generated profile ID for history and flags; session progress updates use generated watch-history session ID. |
| `src/routes/viewer/+page.server.ts` | Receives parsed generated video IDs from forms and passes them to `ViewerFlagService`. |
| `src/routes/viewer/+page.svelte` | Selection state and bulk actions use generated `video.id`; action form fields submit `videoId` and comma-separated `videoIds`; filters and links carry generated `channelId`/`groupId`. |
| `src/routes/viewer/watch/[videoId]/+page.server.ts` | Route param `videoId` is a YouTube ID for load/history/watch actions, but toggle flag forms still pass generated `videoId` into `ViewerFlagService`. |
| `src/routes/viewer/watch/[videoId]/+page.svelte` | Toggle form submits `data.video.id` as `videoId`; "Channel" link uses generated `data.video.channel_id` as `channelId`; player uses YouTube `youtube_id` separately. |
| `src/routes/viewer/virtual-channels/+page.svelte` | Links to viewer groups with generated virtual-channel `groupId = g.id`. |

## History Route Paths

| Path | Generated ID handoff |
| --- | --- |
| `src/routes/history/+page.server.ts` | Parses `channelId` query param as generated source-channel ID; resolves generated `activeProfileId`; passes both into history read queries; returns generated `profileId`, `video_id`, and `channel_id`. |
| `src/routes/history/+page.svelte` | Channel filter options use generated `ch.id`; "Channel" links use generated `it.channel_id`; session grouping compares generated `video_id`. |

## Admin Source Channel Paths

| Path | Generated ID handoff |
| --- | --- |
| `src/lib/server/admin/AdminSourceChannelPageService.ts` | Update/delete/refresh receive generated source-channel `id`; update and refresh re-read the channel by generated ID to obtain YouTube ID; refresh import returns generated `channelId`; `markRefreshed(input.id)` writes by generated ID. |
| `src/routes/admin/source-channels/+page.server.ts` | Parses hidden `id` form fields as generated source-channel IDs for update/delete/refresh. |
| `src/routes/admin/source-channels/+page.svelte` | Update/delete/refresh forms submit hidden generated source-channel `ch.id`. |

## Admin Virtual Channel Paths

| Path | Generated ID handoff |
| --- | --- |
| `src/lib/server/admin/AdminVirtualChannelIndexService.ts` | Loads assignments by generated `virtualChannel.id`; validates source/virtual channel IDs; adds/removes assignments with generated source/virtual-channel IDs; builds maps keyed by generated source-channel IDs. |
| `src/lib/server/admin/AdminVirtualChannelManageService.ts` | Route context uses generated virtual-channel ID; add association uses generated source/virtual IDs; mode/remove/review actions use generated assignment ID; review actions validate generated `video.id` belongs to generated `assignment.source_channel_id`; selected-only lists use generated assignment/video IDs. |
| `src/routes/admin/virtual-channels/+page.server.ts` | Parses generated `id`, `virtual_channel_id`, and `source_channel_id` form values. |
| `src/routes/admin/virtual-channels/+page.svelte` | Inline association forms submit generated `g.id`, `item.assignment.source_channel_id`, and source-channel option `channel.id`; rename/delete forms submit generated virtual-channel `g.id`. |
| `src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts` | Route param is generated virtual-channel ID; forms parse generated `source_channel_id`, `assignment_id`, `video_id`, and `video_ids`. |
| `src/routes/admin/virtual-channels/[virtualChannelId]/+page.svelte` | Add association selects generated `channel.id`; mode/remove/review forms submit generated `item.assignment.id`; bulk review forms submit generated video IDs from `video.id`; single review forms submit generated `video.id`. |

## Test Paths

| Test area | Current generated-ID contract under test |
| --- | --- |
| `tests/lib/viewer-query-parser.test.ts` | Expects numeric `channelId` and `groupId` query params, including current `NaN` behavior for invalid numeric input. |
| `tests/lib/viewer-video-query-spec.test.ts` | Asserts `v.channel_id = :channelId`, generated virtual-channel `groupId`, generated profile ID, and generated assignment/video joins. |
| `tests/lib/history-read-query-spec.test.ts` | Asserts history filters use `h.profile_id = :profileId` and `v.channel_id = :channelId`. |
| `tests/lib/viewer-action-parser.test.ts` | Asserts generated integer `videoId`/`videoIds` parsing and generated video IDs inside undo/restore JSON payloads. |
| `tests/lib/server-action-form.test.ts` | Asserts integer extraction for repeated `video_id` and CSV `video_ids` fields used by admin bulk review actions. |
| `tests/lib/dao-modules.test.ts` | Uses sample generated `video_id` and `profile_id`; asserts reader SQL includes generated `COUNT(DISTINCT v.id)`. |
| `tests/lib/viewer-page-state.test.ts` and `tests/lib/viewer-selection.test.ts` | Model visible videos and selected videos with generated `id`; query state includes generated `channelId` and `groupId`. |
| `tests/lib/viewer-display.test.ts` | Uses generated `id` and `channel_id` in viewer display records. |
| `tests/lib/youtube/mapper.test.ts` | Expects `YouTubeVideoUpsertMapper` to copy a numeric generated `channel_id` into video upserts. |
| `tests/admin/source-channel-routes.test.ts` | Route fixtures expose generated source-channel `id` for source-channel admin page behavior. |
| `tests/profile-route.test.ts` | Preserves return URLs containing generated `channelId` query params. |

## Summary

Generated row IDs currently act as relationship and transport identifiers across every major workflow:

- `source_channels.id` flows into videos, assignments, viewer/history channel filters, admin source-channel actions, and import refresh paths.
- `videos.id` flows into flags, watch history, selected-only review state, viewer selection/bulk actions, admin review actions, and reader return models.
- `profiles.id` flows from cookie-selected profile keys into flags, history, and viewer/history read queries.
- `virtual_channels.id` flows into assignment relationships, admin route params/forms, and viewer group filters.
- `virtual_channel_assignments.id` flows into selected-only review state, admin form fields, per-assignment filters, and assignment-mode actions.
- `watch_history.id` is used only as an internal session update key after a video/profile session has been resolved.
