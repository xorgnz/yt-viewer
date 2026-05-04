# Tasks: 10-timers

## Relevant Files

- `src/lib/entities/virtualChannel.ts` - Extend the virtual channel model with optional timer settings.
- `src/lib/daos/virtualChannelDAO.ts` - Persist and load virtual channel timer configuration.
- `src/lib/daos/_schema.ts` - Add schema changes for timer fields if they do not already exist.
- `src/lib/daos/migrations/` - Add a forward-only migration for timer-related schema updates.
- `src/lib/daos/historyDAO.ts` - Add timer-usage queries derived from watch history.
- `src/lib/server/viewer/ViewerWatchService.ts` - Enforce timer limits during watch-session persistence and playback flow.
- `src/lib/server/viewer/ViewerVirtualChannelService.ts` - Surface capped-channel availability state in viewer data.
- `src/lib/server/viewer/ViewerLoadService.ts` - Include timer-derived availability in viewer page loads where needed.
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts` - Save timer settings from the admin form.
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.svelte` - Add the timer section and validation feedback to the virtual channel edit UI.
- `src/routes/viewer/virtual-channels/+page.server.ts` - Load capped/unavailable channel state for the viewer channel list.
- `src/routes/viewer/virtual-channels/+page.svelte` - Show capped channels as greyed out and non-selectable.
- `src/routes/viewer/watch/[videoId]/+page.server.ts` - Block or stop playback when the selected channel has exhausted its daily allowance.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - Show timer-limit status messaging in the player UI.
- `src/routes/viewer/+page.server.ts` - Ensure video-list data carries capped/unavailable state where needed.
- `src/lib/viewer/components/ViewerResultsGrid.svelte` - Render capped-channel videos as visible but disabled.
- `tests/` - Add targeted migration, DAO, service, and route coverage around timer logic.

## Tasks

- [x] 1 - Add virtual-channel timer persistence
  - [x] 1.1 - Review the existing virtual channel schema, entity, and DAO shape to identify the smallest storage change for an optional daily minute allowance.
  - [x] 1.2 - Add forward-only database migration support for the timer fields needed on virtual channels.
  - [x] 1.3 - Update the virtual channel entity and DAO read/write paths so timer settings persist cleanly and remain optional.

- [x] 2 - Add deterministic timer-usage calculation from watch history
  - [x] 2.1 - Inspect the existing `watch_history` structure and session-update behavior to define the exact aggregate query needed for per-channel daily usage.
  - [x] 2.2 - Add DAO support to calculate consumed watch time for a virtual channel within a day window.
  - [x] 2.3 - Define one timezone source for day-boundary calculations in implementation, using existing app configuration if present and otherwise one shared fallback.
  - [x] 2.4 - Add focused tests for day-window aggregation, unlimited channels, and edge conditions around reset boundaries.

- [x] 3 - Enforce timer caps in viewer services
  - [x] 3.1 - Update viewer service logic to derive capped/unlimited state for a virtual channel from persisted timer settings and watch-history usage.
  - [x] 3.2 - Prevent further playback selection for capped channels while leaving unlimited channels unchanged.
  - [x] 3.3 - Stop playback and return a deterministic capped-state result once the allowance is exhausted.

- [x] 4 - Add timer management to the virtual channel admin UI
  - [x] 4.1 - Add a dedicated timer section to the virtual channel edit page.
  - [x] 4.2 - Support uncapped mode and minute-based allowance entry.
  - [x] 4.3 - Validate invalid values and preserve user-entered state on form errors.
  - [x] 4.4 - Persist timer changes through the existing server action flow.

- [x] 5 - Reflect capped state in the viewer channel list and video list
  - [x] 5.1 - Update viewer virtual-channel loading so capped channels remain visible but are marked unavailable.
  - [x] 5.2 - Grey out capped channels in the channel list and block selection interactions.
  - [x] 5.3 - Keep the capped channel's video list visible while rendering videos as disabled and non-clickable.

- [x] 6 - Add playback-limit messaging in the player flow
  - [x] 6.1 - Add a player-visible status message for timer exhaustion.
  - [x] 6.2 - Make the watch page stop or refuse playback cleanly when the channel is capped.

- [x] 7 - Validate the feature with targeted automated checks
  - [x] 7.1 - Add or update tests for migration and DAO behavior around optional timer settings.
  - [x] 7.2 - Add service-level tests for capped-state calculation and enforcement from watch-history aggregates.
  - [x] 7.3 - Add focused route or UI coverage for disabled channel/video presentation where the current test stack supports it.

- [ ] 8 - Add virtual channel timer status to viewer navigation
  - [x] 8.1 - Extend viewer page and watch page data with the active virtual channel timer fields needed for navigation display.
  - [x] 8.2 - Render a compact virtual channel info panel in the left navigation above the profile section.
  - [x] 8.3 - Show the active channel name plus unlimited, limited, or capped status with current usage or remaining time.
  - [ ] 8.4 - Extract the virtual channel timer panel into its own component once the nav display fields and formatting behavior are stable.
  - [ ] 8.5 - Keep the timer panel behavior and wording aligned between the main viewer page and the watch page.
  - [ ] 8.6 - Validate unlimited, limited, and capped display states.
