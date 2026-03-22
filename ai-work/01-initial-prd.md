# Product Requirements Document: YouTube Viewer & Tracker (V1)

## 1. Introduction/Overview

This product is a focused YouTube viewer and tracker that lets a user curate channels, import all available videos, and watch them in a distraction-free interface. It is intended to replace YouTube's cluttered experience with a faster local-first web app that supports curated viewing, child-safe usage, and reliable watch tracking.

The primary goal is to give the user control over what appears in the library, how videos are organized, and how viewing progress is recorded for each profile.

## 2. Goals

1. Enable reliable import of all available videos from a specified YouTube channel and store them locally with per-profile flags.
2. Allow users to watch videos within the app and auto-mark videos as watched based on completion rules.
3. Provide an efficient browsing and selection experience using channel groups, filters, and video flags.
4. Support two hard-coded user profiles with separate flag states and UI preferences.

## 3. User Stories

- As an adult user, I want to add a YouTube channel by channel ID and import its videos so I can track them without using YouTube's interface.
- As an adult user, I want to group channels so I can browse content by topic or audience.
- As a viewer, I want to watch a video inside the app so I can stay focused and avoid recommendations.
- As a viewer, I want videos to be marked watched when I finish them so I do not lose progress.
- As a user, I want to flag videos as ignored or favorite so I can curate what I watch.
- As an admin, I want to manage channels and channel groups in a protected admin area.
- As a parent, I want a child-friendly profile that only shows curated channels and videos.

## 4. Functional Requirements

1. The system must allow an admin to add a YouTube channel by channel ID.
2. The system must retrieve and store all currently available videos for a channel via the public YouTube API.
3. The system must store videos locally with per-profile flags for ignored, watched, and favorite state.
4. The system must support exactly two hard-coded user profiles, adult and child, with separate flag state and UI preferences.
5. The system must allow an admin to create, update, and delete channel groups.
6. The system must allow an admin to assign channels to channel groups.
7. The system must provide a watch grid for a selected channel or channel group.
8. The watch grid must support filtering by search term, date range, and watched status.
9. The system must allow users to mark a video as ignored or favorite from the UI.
10. The system must provide embedded video playback using YouTube's standard embed/iframe.
11. The system must automatically mark a video as watched when the viewer reaches the last 30 seconds, or the last 25 percent if the video is under 2 minutes.
12. The system must maintain a watch history log containing at least the video, timestamp, and profile.
13. The watch history view must support filters by profile, channel, and date.
14. The system must include a manual refresh action to re-import a channel's available videos.
15. Admin pages must be protected by a hard-coded password and separated from the general viewer flow.

## 5. Non-Goals (Out of Scope)

- User authentication or account security beyond a hard-coded admin password
- Public hosting, multi-tenant support, or remote database requirements
- Recommendation or algorithmic suggestions outside user-defined filters
- Native mobile or desktop clients

## 6. Design Considerations (Optional)

- The admin and viewer experiences should have clearly separated navigation.
- The child-facing experience should be simplified and avoid exposure to unrelated or recommended content.
- The watch grid should make watched, ignored, and favorite state easy to scan.

## 7. Technical Considerations (Optional)

- The application is built with SvelteKit.
- Persistence is local-first and may use SQLite.
- Channel and video metadata comes from the public YouTube API.
- Playback uses YouTube embed/iframe support, so watch-completion logic must work within that constraint.

## 8. Success Metrics

- A user can import a channel and see all available videos stored locally.
- Watched status updates correctly based on the defined completion rules.
- Users can filter, ignore, and favorite videos reliably.
- Admin users can manage channels and groups without errors.
- The child profile remains curated and distraction-free.

## 9. Clarifications Applied

- V1 is balanced across distraction-free viewing, child-safe curation, and robust tracking rather than optimizing for just one of those goals.
- The initial release supports exactly two hard-coded profiles, one adult and one child, with no password-based user authentication.
- Admin functionality must include management of both channels and channel groups.
- Watch history is expected to be a list view with filters by profile, channel, and date.
- Channel import should pull all currently available videos once and support manual refresh from the UI.

## 10. Open Questions

- How should video metadata changes, such as title or thumbnail updates, be handled during refresh?
- Should the child profile be fully blocked from admin routes, or is some limited visibility acceptable?
- Are there specific accessibility or presentation requirements for the child profile UI?
