# Draft PRD: Watch History Sessions

## 1. Introduction/Overview

This feature replaces the current watch-history model with a lightweight session log that is independent from the watched flag. The goal is to let the application represent actual viewing activity without forcing it to match the binary "watched" state, while still preserving the existing watched-flag workflow for manual and threshold-based watched behavior.

The feature also expands the history page so users can validate the new behavior directly in the UI. The page should expose session-level watch data, explain the recording logic through inline help, and support both a chronological session view and a per-video aggregated view.

## 2. Goals

1. Decouple watch history from the watched flag so either can exist without the other.
2. Record watch history as session entries that accumulate actual time spent watching.
3. Create a session after more than 5 seconds of watch time and continue updating it periodically while playback continues.
4. Reuse an existing session when playback resumes within 5 minutes of the last persisted update, and create a new session after longer gaps.
5. Preserve the existing watched-flag behavior, while ensuring manual watched toggles do not affect history.
6. Expand the history page so the richer history data is visible and understandable.

## 3. User Stories

- As a viewer, I want partial viewing sessions recorded even if I never watch enough of a video to count as watched.
- As a viewer, I want manually marking a video as watched to affect only the watched flag, not fabricate a watch-history event.
- As a viewer, I want the app to keep extending the same watch session when I briefly stop and return, so my history reflects one continuous viewing session.
- As a viewer, I want a fresh history entry when I return much later, so distinct viewing sessions stay distinct.
- As a viewer, I want repeated viewing and rewatches to count toward session watch time, because I care about time spent watching, not just the furthest timestamp reached.
- As a viewer, I want to inspect history chronologically by session.
- As a viewer, I want to inspect history grouped by video so I can understand repeat viewing over time.
- As a viewer, I want inline help on the history page so I can understand exactly when entries are created and updated.

## 4. Functional Requirements

1. The system must treat `watch_history` as independent from the `watched` flag.
2. Marking a video as watched manually must not create, update, or delete any watch-history entry.
3. Clearing the watched flag manually must not create, update, or delete any watch-history entry.
4. The existing automatic watched-flag behavior on the watch page must remain in place, based on the current end-of-video threshold logic.
5. The watch page must accumulate watch time based on active playback rather than playback position reached.
6. Watch time should accumulate while the player is actively playing; if implementation complexity makes strict `PLAYING` detection impractical, treating non-paused active playback states as watchable time is acceptable.
7. Replayed or rewatched segments must count again toward accumulated watch time.
8. The system must create a watch-history session entry only after the current viewing session exceeds 5 seconds of accumulated watch time.
9. Before the 5-second threshold is crossed, no watch-history row should be persisted for that session.
10. Once a session entry exists, the system must update it periodically while playback continues, with a target cadence of about every 10 seconds.
11. Each history session entry must store accumulated `time_watched_seconds`.
12. Each history session entry must store a start timestamp representing when that persisted session began.
13. Each history session entry must store a last-updated timestamp representing the latest persisted activity for that session.
14. When a viewer resumes watching the same video on the same profile within 5 minutes of the last-updated timestamp of the most recent matching session, the system must continue updating that same session entry.
15. When a viewer resumes watching the same video on the same profile more than 5 minutes after the last-updated timestamp of the most recent matching session, the system must create a new session entry after the 5-second threshold is crossed again.
16. The session continuation decision may use the persisted last-updated timestamp as an approximation of when the prior watching activity stopped.
17. Existing watch-history data may be discarded as part of the schema change for this feature.
18. The history page must expose the stored watch-session data for validation.
19. The history page must show at least: video title, source channel name, session start timestamp, last-updated timestamp, and accumulated time watched.
20. The history page must provide a chronological session-oriented view with one row per persisted watch session.
21. The history page must also provide a per-video view or mode that groups or aggregates watch history by video.
22. The per-video view must present a compact summary by default and allow expansion into the underlying sessions for that video.
23. The history page must include a help control with inline expandable help content that explains:
24. The 5-second creation threshold.
25. The approximate 10-second update cadence.
26. That watch time reflects time spent watching, not furthest playback position.
27. That sessions resume within 5 minutes and split after longer gaps.
28. That watched status is separate from watch history.
29. The history page does not need to persist the selected view mode across navigation in this feature.

## 5. Non-Goals

- Capturing device, browser, referrer, playback-speed, or other richer playback metadata
- Precisely reconstructing the exact stop time of a viewing session
- Preserving or migrating legacy watch-history rows
- Changing the watched-threshold rules themselves in this feature
- Building an advanced modal or analytics-style history exploration UI in this phase

## 6. Design Considerations

- The history page should make it easy to validate the new session rules from visible data alone.
- The chronological session view should favor scanability for recent activity.
- The per-video mode should make repeat sessions understandable without hiding their individual existence, using a summary-first presentation with expandable session details.
- The inline help should be discoverable but lightweight, using expandable content rather than a heavy interaction pattern.
- The page should clearly distinguish watched state concepts from session-history concepts so the user is not misled by similarly named data.

## 7. Technical Considerations

- The `watch_history` schema will need to change to support session tracking and accumulated watch time.
- The watch page client logic will need to track elapsed playback time independently from the player's current position.
- Persisting watch time at intervals means the client will need a lightweight update path in addition to the current watched-toggle action.
- The history DAO and history page loader will need new query shapes for both session-by-time and per-video views.
- Existing local history can be reset rather than migrated, which simplifies the schema update path.
- The watched flag remains stored separately in `video_flags` and must not be derived from history rows.

## 8. Success Metrics

- A video can have watch-history entries without being marked watched.
- A video can be marked watched without creating a watch-history entry through the manual watched control.
- A viewing session appears in history after more than 5 seconds of watch time.
- Continued playback updates the same history session over time rather than creating duplicate entries during short interruptions.
- Resuming after a gap longer than 5 minutes results in a distinct new session entry.
- The history page allows the user to verify both chronological session history and per-video viewing history.
- The help content accurately explains the rules and reduces ambiguity during validation.

## 9. Clarifications Applied

- History should be created and updated from playback activity, not from watched-flag changes.
- Manual `Mark as Watched` should remain, but it only changes the watched flag.
- Existing automatic watched behavior at the current threshold remains in place.
- History sessions should begin only after more than 5 seconds of accumulated watch time.
- Persisted sessions should update periodically at roughly 10-second intervals.
- Session reuse should be based on whether the last persisted update is within 5 minutes.
- A small margin of error around actual stop time is acceptable.
- Time watched should count repeated viewing and rewatches; it is not a unique-progress metric.
- The history page should support both chronological session viewing and a per-video history mode.
- The history page should show video title, source channel name, session start timestamp, last updated timestamp, and accumulated time watched.
- Expandable inline help is sufficient for explaining the logic in this feature.
- The per-video mode should be summary-first with expandable session details.
- The history page does not need to remember the selected view mode across navigation in this feature.

## 10. Open Questions

- None at this stage.
