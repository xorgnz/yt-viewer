# Timer System Summary

## Purpose

Feature `10-timers` adds an optional daily playback cap to each virtual channel. A channel with no configured cap remains unlimited. A capped channel consumes time from persisted watch-history entries for the active profile inside the current day window.

This document describes how the current implementation works today, including where timer state is stored, how the UI derives live values, and where enforcement happens.

## Stored Configuration

Virtual-channel timer configuration is persisted on `virtual_channels.daily_timer_max`.

Relevant files:

- `src/lib/entities/virtualChannel.ts`
- `src/lib/daos/virtualChannelDAO.ts`
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts`

`daily_timer_max` is stored as seconds. `null` means the channel is unlimited.

## Source Of Truth For Usage

Consumed timer usage is derived from `watch_history`, not from a separate timer ledger.

Relevant files:

- `src/lib/daos/historyDAO.ts`
- `src/lib/server/viewer/ViewerVirtualChannelService.ts`
- `src/lib/server/viewer/ViewerWatchService.ts`

The core aggregate is `HistoryDAO.getVirtualChannelWatchSecondsInWindow(...)`. That query:

1. starts from `watch_history`
2. joins `videos`
3. joins `virtual_channel_assignments` through `videos.channel_id`
4. sums `time_watched_seconds`
5. filters by `profile_id`
6. filters by `virtual_channel_id`
7. filters by `last_updated_at` inside the active day window

This means timer usage is profile-scoped and virtual-channel-scoped, but it is inferred from watched videos that belong to source channels assigned to the virtual channel.

## Day Window

The active timer window is calculated in `ViewerVirtualChannelService`.

Relevant files:

- `src/lib/server/viewer/ViewerVirtualChannelService.ts`
- `src/lib/server/AppTimezonePolicy.ts`

Current behavior:

1. read the configured application timezone from `AppTimezonePolicy.configuredTimezone`
2. compute the current local calendar day in that timezone
3. convert local midnight boundaries back to UTC milliseconds
4. use `[startMs, endMs)` as the timer window

Every timer usage query and timer reset query is scoped to that window.

## Derived Timer View Model

`ViewerVirtualChannelService` builds a `ViewerVirtualChannel` object for each virtual channel.

Relevant file:

- `src/lib/viewer/types.ts`

The derived fields are:

- `dailyTimerMax`
- `timerUsageSeconds`
- `timerRemainingSeconds`
- `timerState`
- `timerWindowStartMs`
- `timerWindowEndMs`

Timer states:

- `unlimited`: `dailyTimerMax` is `null`
- `available`: a cap exists and `timerUsageSeconds < dailyTimerMax`
- `capped`: a cap exists and `timerUsageSeconds >= dailyTimerMax`

## Where Timer State Is Loaded

Timer state is loaded in two main viewer surfaces:

1. navigation / side panel through `ViewerVirtualChannelService.loadVirtualChannels()`
2. watch page through `ViewerWatchService.load(...)`

On the watch page, `ViewerWatchService.load(...)` resolves the selected virtual channel and includes:

- `currentVirtualChannelId`
- `activeVirtualChannel`
- `playbackBlockedMessage`

If the selected channel is already capped at page-load time, `playbackBlockedMessage` is set to `Daily timer limit reached for this virtual channel.`

## Playback History Recording

Watch-page playback tracking lives in:

- `src/routes/viewer/watch/[videoId]/+page.svelte`
- `src/routes/viewer/watch/[videoId]/+page.server.ts`
- `src/lib/server/viewer/ViewerWatchService.ts`

The watch page tracks local elapsed playback time with a 1-second polling loop.

Important local state on the watch page includes:

- `elapsedWatchSeconds`
- `historySessionCreated`
- `lastPersistedWatchSeconds`
- `activeVirtualChannelUsageBaselineSeconds`
- `activeVirtualChannelId`

### Session creation

After at least 1 second of local playback, the page posts to `?/createHistorySession`.

That action calls `ViewerWatchService.createHistorySession(...)`.

Server behavior:

1. verify the selected virtual channel is not already capped
2. load the video
3. find the most recent watch-history session for `(video, profile)`
4. if the last session was updated within `HISTORY_SESSION_GAP_MS` (5 minutes), reuse it
5. otherwise create a new watch-history row
6. check the virtual channel again after the write

The second check exists so the write that crosses the limit can still trigger a capped result immediately after persistence.

### Session updates

Once a session exists, the page posts to `?/updateHistoryProgress` every additional second of elapsed watch time.

That action calls `ViewerWatchService.updateHistoryProgress(...)`.

Server behavior:

1. verify the selected virtual channel is not already capped
2. load the video
3. find the most recent watch-history session for `(video, profile)`
4. reject if no session exists
5. reject if the last update is older than the 5-minute session gap
6. update `last_updated_at`
7. update `time_watched_seconds`
8. check the virtual channel again after the write

## Live UI Timer Behavior

The side-nav timer panel updates optimistically from browser events while playback is active.

Relevant files:

- `src/routes/viewer/watch/[videoId]/+page.svelte`
- `src/lib/components/SideNavVirtualChannelPanel.svelte`
- `src/lib/components/SideNav.svelte`

Flow:

1. the watch page increments local `elapsedWatchSeconds`
2. each playback tick dispatches `viewer:playback-tick`
3. the side-nav virtual-channel panel listens for that event
4. if the event channel matches the active virtual channel, it increments the displayed `timerUsageSeconds`
5. it also decrements `timerRemainingSeconds`
6. if remaining time reaches zero, the panel flips its local `timerState` to `capped`

This is only a client-side optimistic display layer. The persisted source of truth remains `watch_history`.

## Local Watch-Page Cap Detection

The watch page also performs a local cap check while playback is active.

`shouldLocallyCapPlayback()` compares:

- `activeVirtualChannelUsageBaselineSeconds`
- plus local `elapsedWatchSeconds`
- against `data.activeVirtualChannel.dailyTimerMax`

If the local total reaches the cap, the page calls `handleTimerCapReached(...)`, which:

- shows the blocked message
- marks playback as blocked
- stops polling
- pauses the YouTube player

This gives immediate feedback before the next server round-trip completes.

## Server-Side Enforcement

Server-side cap enforcement happens in `ViewerWatchService.ensureGroupAllowsPlayback(...)`.

That check is used:

- before creating a history session
- after creating a history session
- before updating a history session
- after updating a history session

If the virtual channel is capped, the watch service returns:

- `status: 409`
- `code: 'timer_capped'`

The watch-page form actions convert that into an action failure payload with:

- `message`
- `code`
- `timerState: 'capped'`

The watch page reads that failure payload and moves into the blocked state.

## Reset Behavior

There is a debug reset route:

- `src/routes/viewer/debug/reset-virtual-channel-timer/+server.ts`

That route calls `ViewerVirtualChannelService.resetVirtualChannelTimer(...)`, which deletes matching `watch_history` rows for:

- the active profile
- the selected virtual channel
- the current day window

This is a destructive debug operation against watch-history data inside the current timer window.

## Important Limitations Of The Current Design

1. Usage is derived by joining videos back to source-channel assignments. It is not attached directly to a specific virtual-channel playback session.
2. Client-side timer displays are optimistic and can lead persisted server state briefly.
3. The watch page keeps its own local timer baseline and local elapsed time in addition to the persisted aggregate.
4. The watch page, side-nav panel, and server enforcement all participate in timer behavior, so bugs can come from mismatches between those layers.
5. Because timer usage is based on `watch_history.last_updated_at` within the current window, the effective accounting window follows session updates rather than a separate timer event log.

## Current Implementation Boundaries

In practical terms, the timer system is split like this:

- configuration and day-window calculation: `ViewerVirtualChannelService`
- aggregate watch-time query and reset: `HistoryDAO`
- watch-page persistence and enforcement checks: `ViewerWatchService`
- watch-page local playback accumulation and cap UX: `src/routes/viewer/watch/[videoId]/+page.svelte`
- live side-nav display updates: `SideNavVirtualChannelPanel.svelte`

That split is the main thing to keep in mind while debugging it. If the displayed timer, blocked state, and persisted timer usage disagree, the bug is usually in the handoff between those layers rather than in one isolated function.
