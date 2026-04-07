# Project Scope: Watch History Sessions

## Overview

This feature upgrades watch history from a simple watched-event list into a lightweight playback-session log. It separates watch history from the watched flag so the system can represent both "this profile has watched enough of this video to count as watched" and "this profile spent time watching this video during these sessions" without forcing those concepts to match.

The feature also improves the history UI so the stored session data is visible and understandable. The history page should expose the new session information and provide a help affordance that explains when history starts, how watch time accumulates, how sessions are extended, and when a new session is created.

## Problem Statement

The current implementation couples watch history to the watched flag and only records a timestamped watched event. That model cannot accurately represent partial viewing, manual watched toggles, or repeat viewing sessions. It also makes the history list less useful for validation because it hides the logic behind what was recorded and why.

## Target Users

- Primary: the viewer/admin using the app who wants history to reflect actual viewing behavior more accurately
- Secondary: future development work that needs a cleaner separation between watched state and playback history

## Core Objectives

1. Decouple watch history entries from the watched flag so each can exist independently.
2. Record watch history as lightweight sessions with accumulated watch time and session continuation rules.
3. Expose the richer history data and its logic clearly on the history page.

## In Scope

- Schema and model changes for watch history so it can store session-level watch-time data
- Creation of a history entry after more than 5 seconds of accumulated watch time
- Periodic updates to an active history entry while playback continues, approximately every 10 seconds
- Reuse of the same history entry when playback resumes within 5 minutes of the last history update
- Creation of a new history entry when playback resumes after more than 5 minutes
- Retaining the manual watched toggle while removing its side effects on history
- Preserving the existing automatic watched-flag behavior when the video reaches the watched threshold
- Updating the history page to show the new watch-history fields
- Adding a help button or help content on the history page that explains the recording rules
- Discarding existing watch-history data as part of the schema reset for this feature

## Explicitly Out of Scope

- Capturing richer playback metadata beyond accumulated watch time in this feature
- Exact reconstruction of stop/start times for every viewing interruption
- Device, browser, referrer, or playback-speed tracking
- Attempting to preserve or migrate old watch-history rows

## Assumptions and Constraints

- Session boundaries may be inferred using the gap between the last persisted history update and the current time
- A small margin of error in stop time is acceptable
- Watch time should reflect accumulated time spent watching, not merely the furthest playback position reached
- History updates should be lightweight and periodic rather than continuous
- Existing local watch-history data may be replaced directly

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope
- [ ] Generate task breakdown
