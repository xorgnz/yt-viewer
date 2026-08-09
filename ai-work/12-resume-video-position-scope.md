# Project Scope: Resume Video Position

## Overview

Add automatic resume behavior to the viewer watch page so each profile starts a video at the last playback position recorded by this app. The feature builds on existing watch-history sessions and keeps resume state profile-specific, matching the existing watch-history ownership model.

The implementation should persist the actual YouTube playback position separately from accumulated watch time, then use the latest applicable history session when loading the watch page.

## Problem Statement

The app currently records accumulated watch time, but it does not record the actual playback position where the viewer stopped. Users returning to a partially watched video must manually seek back to where they left off.

## Target Users

Viewer users watching videos through the app, especially across interrupted or repeated sessions and across multiple profiles.

## Core Objectives

1. Store the latest playback position for each profile/video history session.
2. Automatically resume playback from the latest saved position when opening a video.
3. Keep resume behavior simple and local to this app's own watch history.

## In Scope

- Add a nullable playback-position field to watch-history persistence.
- Update watch-history create/update flows to receive and store the player's current playback position.
- Load the latest profile-specific saved position for the watch page.
- Automatically seek or start the YouTube player at that position.
- Ignore saved resume position when the video is already marked watched.
- Add focused schema, DAO/service, route, and watch-page behavior tests where practical.

## Explicitly Out of Scope

- Resume prompts or user choice before resuming.
- Restart-from-beginning or clear-position UI.
- Importing or considering watch position from outside this app.
- Resume suppression based on age, near-end threshold, or other heuristics besides watched state.
- Reworking watch-history semantics beyond adding actual playback position.

## Assumptions and Constraints

- Resume position is profile-specific because watch history already stores `profile_id`.
- The latest watch-history session for a profile/video is sufficient as the resume source.
- `time_watched_seconds` remains accumulated watch time and should not be reused as playback position.
- The existing forward-only migration workflow must be followed.
- Route files should stay thin; persistence and orchestration should remain in DAO/service boundaries.
