# Product Requirements Document: YouTube Viewer & Tracker (V1)

## 1. Introduction/Overview

This product is a focused YouTube viewer and tracker that lets a user curate channels, import all videos, and watch them in a distraction-free interface. It addresses the need for a fast, curated viewing experience and a child-safe mode without YouTube’s recommendations or clutter. The goal is to provide a streamlined web app that supports channel organization, video flagging, and embedded playback with watch tracking.

## 2. Goals

1. Enable reliable import of all available videos from a specified YouTube channel and store them locally with per-profile flags.
2. Allow users to watch videos within the app and auto-mark videos as watched based on completion rules.
3. Provide an efficient browsing and selection experience using channel groups, filters, and video flags.
4. Support two hard-coded user profiles (adult + child) with separate flag states and UI preferences.

## 3. User Stories

- As an adult user, I want to add a YouTube channel by ID and import its videos so I can track them without using YouTube’s interface.
- As an adult user, I want to group channels so I can browse content by topic or audience.
- As a viewer, I want to watch a video inside the app so I can stay focused and avoid recommendations.
- As a viewer, I want videos to be marked watched when I finish them so I don’t lose progress.
- As a user, I want to flag videos as ignored or favorite so I can curate what I watch.
- As an admin, I want to manage channels and channel groups in a protected admin area.
- As a parent, I want a child-friendly profile that only shows curated channels and videos.

## 4. Functional Requirements

1. The system must allow an admin to add a YouTube channel by channel ID.
2. The system must retrieve and store all currently available videos for a channel via the public YouTube API.
3. The system must store videos locally with per-profile flags: ignored, watched, favorite.
4. The system must support exactly two hard-coded user profiles (adult and child) with separate flag states.
5. The system must allow an admin to create, update, and delete channel groups.
6. The system must allow an admin to assign channels to channel groups.
7. The system must provide a watch grid for a selected channel or channel group.
8. The watch grid must support filtering by search term, date range, and watched status.
9. The system must allow users to mark a video as ignored or favorite from the UI.
10. The system must provide embedded video playback using YouTube’s standard embed/iframe.
11. The system must automatically mark a video as watched when the viewer reaches the last 30 seconds, or the last 25% if the video is under 2 minutes.
12. The system must maintain a watch history log containing at least video, timestamp, and profile.
13. The watch history view must support filters by profile, channel, and date.
14. The system must include a manual “Refresh” button to re-import the channel’s available videos.
15. Admin pages must be hidden behind a dedicated admin view and protected by a hard-coded password.

## 5. Non-Goals (Out of Scope)

- User authentication or security beyond a hard-coded admin password
- Public hosting, multi-tenant support, or remote database requirements
- Recommendation or algorithmic suggestions outside user-defined filters
- Mobile or desktop-native clients (web-only)

## 6. Design Considerations (Optional)

- Provide distinct navigation for admin vs. viewer pages.
- Ensure the child-facing UI is simplified and avoids any external recommendations.
- Watch grid should emphasize visibility of watched/ignored/favorite states.

## 7. Technical Considerations (Optional)

- Local database (e.g., SQLite) for persistence.
- Frontend built in SvelteKit.
- YouTube public API for channel/video retrieval.
- Embed/iframe for playback; ensure watch completion logic can observe progress.

## 8. Success Metrics

- A user can import a channel and see all available videos stored locally.
- Watched status updates correctly based on completion rules.
- Users can filter, ignore, and favorite videos reliably.
- Admin can manage channels and groups without errors.
- Child profile experience remains curated and distraction-free.

## 9. Open Questions

- How should video metadata updates (title/thumbnail changes) be handled on refresh?
- Should the child profile restrict access to admin views entirely, or allow view-only?
- Are there preferred UI layouts or accessibility considerations for the child profile?