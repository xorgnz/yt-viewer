# Project Scope: YouTube Viewer & Tracker (V1)

## Overview

This project is a focused YouTube viewer and tracker that lets a user curate channels, import their videos, and watch them in a distraction-free interface. It aims to replace YouTube’s cluttered UI with a streamlined experience for both the primary user and a child-friendly viewing mode.

The system will organize channels into groups, store all videos with user-specific flags, and provide a watch grid with filtering. Watching a video in the app will automatically set the watched flag based on defined completion rules.

## Problem Statement

YouTube’s interface is slow and distracting, and it does not support curated viewing for a child. The user needs a way to work through selected channel videos efficiently, track progress, and provide a safe viewing experience without algorithmic recommendations.

## Target Users

- Primary: the adult user who curates and manages channels
- Secondary: the user’s child, via simplified/child-appropriate viewing interfaces

## Core Objectives

1. Import all videos from a specified YouTube channel and store them with flags.
2. Provide an embedded viewing experience that marks videos as watched based on completion rules.
3. Enable browsing/selection of videos via channel groups, filters, and flag-based controls.

## Key Features (High-Level)

- Channel import using the public YouTube API by channel ID
- Channel grouping (create/manage groups of channels)
- Video list storage with flags: ignored, watched (auto), favorite (manual)
- Embedded video playback within the app (YouTube embed/iframe)
- Watch completion detection (last 30s, or last 25% for videos under 2 minutes)
- Watch grid with search/filter criteria (text, date range, watched status)
- Admin view for managing channels and channel groups
- Watch history log with a well-formatted list view
- User profiles with per-user flags and UI preferences (no passwords yet)
- Admin pages protected by a hard-coded password

## Explicitly Out of Scope

- User authentication beyond a hard-coded admin password
- Recommendations or algorithmic suggestions beyond user-defined filters
- Non-web interfaces (mobile app, desktop client)
- Remote/hosted database requirements (assume local DB)

## Success Criteria

- A user can import a channel and see a complete video list stored in the system.
- Videos can be watched in-app, and watched status updates correctly based on completion rules.
- Users can curate videos via flags and a watch grid filter.
- The experience reduces distractions and supports child-safe viewing.

## Technical Context

- Local database (e.g., SQLite)
- Web UI presented in a browser
- Frontend built with SvelteKit
- YouTube public API for channel/video retrieval
- YouTube embed/iframe for playback

## Timeline

- Personal project with a flexible timeline based on available time

## Discovery Q&A

### Questions Asked:

1. What is the primary problem you’re trying to solve?
2. Who are the primary users?
3. What are the top 3 must-have features for V1? (Rank in order)
4. What is explicitly out of scope for V1?
5. How urgent is this project?
6. Are there any technical constraints or preferences?

### Answers Received:

1. A, B, and C: reduce YouTube distraction/slow UI, provide curated child-safe viewing, and organize/track videos with flags.
2. A and B, with primary focus on the adult user and guidance for child-facing interfaces.
3. (1) Import channel videos via public YouTube API and store with flags; (2) watch videos in-app via embed/iframe; (3) video selector for channel/group with ignore/favorite/watch controls.
4. Out of scope: any user security beyond a hard-coded admin password.
5. Flexible/personal timeline depending on available time.
6. Local database (SQLite), web-only UI, frontend in SvelteKit.

### PRD Clarifying Q&A:

#### Questions Asked:

1. What is the primary goal emphasis for V1?
2. Which user profiles should be supported in V1?
3. What are the minimum admin capabilities required at launch?
4. How should the watch history log be used in V1?
5. Any constraints on YouTube data import?

#### Answers Received:

1. D: Balanced across distraction-free viewing, child-safe curation, and robust tracking/flagging.
2. B: Two profiles (adult + child), hard-coded, no passwords.
3. C: Admin must manage both channels and channel groups.
4. B: Watch history list with filters by profile/channel/date.
5. A: Import all available videos once; manual refresh via a UI “refresh” button.

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope with stakeholders
- [ ] Generate task breakdown