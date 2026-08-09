# PRD: Resume Video Position

## Overview

Add automatic resume behavior to the viewer watch page. When a profile opens a video with an existing saved playback position from this app, the YouTube player should seek to that position once the player is ready.

The feature extends the current watch-history persistence model. `time_watched_seconds` remains accumulated watch time for history and timer accounting, while a new `last_position_seconds` value stores the actual playback position used for resume.

## Goals

1. Persist the latest playback position for each profile/video watch-history session.
2. Automatically resume an unwatched video from the latest saved playback position.
3. Keep the behavior simple, profile-specific, and based only on this app's own watch history.

## Scope Boundaries

### In Scope

- Add `last_position_seconds` as a nullable field on `watch_history`.
- Update latest schema bootstrap and add a forward-only migration.
- Extend watch-history entity/DAO create/update/read paths for the new field.
- Include the current YouTube player position in existing create/update history requests.
- Load the latest profile-specific watch-history session on the watch page and expose its saved position.
- Seek once when the YouTube player is ready if the video is not marked watched and the position is valid.
- Ignore saved positions that are `<= 0` or past the known video duration.
- Add targeted tests for schema/migration, DAO/service behavior, route payload parsing, and resume-position decisions where practical.

### Out of Scope

- Resume prompt or user choice before resuming.
- Restart-from-beginning or clear-position UI.
- Imported or external watch-position sources.
- Age-based or near-end resume suppression.
- Clearing saved position when a video is marked watched.
- Reworking timer/watch-history accounting semantics.

## Requirements

### Persistence

- `watch_history` must gain a nullable integer column named `last_position_seconds`.
- New sessions should store both accumulated watched seconds and latest playback position.
- Existing active-session updates should update `last_position_seconds` alongside `time_watched_seconds`.
- Existing rows with `NULL` position should remain valid and simply not resume.

### Server Behavior

- Watch-page load should continue using the latest profile/video history session.
- Load data should include a resume position only when:
  - a latest history session exists
  - `last_position_seconds` is a positive finite number
  - the current video is not marked watched
- Create/update history actions should parse a submitted playback position separately from watched-time seconds.
- Invalid submitted playback positions should be treated as absent or `null`, not as request failures unless existing validation patterns strongly favor failure.

### Client Behavior

- The watch page should send `player.getCurrentTime()` as the playback position with existing history create/update/flush requests.
- The YouTube player should seek once on ready when a valid resume position is present.
- Resume should not run for watched videos.
- If the saved position is past the known video duration, the player should start normally.
- Route-driven video swaps should apply the next video's loaded resume position independently.

## Technical Considerations

- `time_watched_seconds` must not be reused as playback position.
- Timer accounting should continue to use accumulated watch time, not playback position.
- Route files should stay thin: parse form fields, call `ViewerWatchService`, and serialize page data.
- DAO code should own SQL column mapping between `last_position_seconds` and `lastPositionSeconds`.
- The migration must be registered and latest-schema bootstrap must stay aligned.

## Success Criteria

- Returning to an unwatched partially viewed video resumes from the last recorded playback position.
- Returning to a watched video starts normally instead of auto-resuming.
- Existing watch-history timer behavior remains unchanged.
- Existing watch-history records without saved positions do not break watch-page loading.
