# Product Requirements Document: Virtual Channel Management UI

## 1. Introduction/Overview

This feature adds an admin-focused management experience for configuring how virtual channels are built from source channels and their videos. The existing application can already manage imported channels and videos, but it does not yet provide a strong model for controlling which parts of a source channel appear inside a given virtual channel.

The goal of this feature is to let the admin associate a source channel with a virtual channel in one of three ways: include all videos, include long videos only, or selectively review videos one by one. This feature covers the admin UI, supporting data model changes, and local persistence behavior required for that workflow. It does not yet change the viewer UI.

## 2. Goals

1. Provide a dedicated manage-virtual-channel page where the admin can configure source-channel associations for an existing virtual channel.
2. Support per-association inclusion modes of `all`, `long only`, and `selected only`.
3. Let the admin inspect which videos are included automatically for `all` and `long only` associations.
4. Let the admin review and classify videos for `selected only` associations using a ternary state of included, ignored, or not yet reviewed.
5. Reduce repetitive manual curation work through temporary bulk filtering and bulk selection tools within the current list view.

## 3. User Stories

- As an admin, I want to open a virtual channel and manage all of its source-channel associations in one place so I can understand and edit the channel composition clearly.
- As an admin, I want to attach the same source channel to multiple virtual channels with different rules so each virtual channel can reflect a different curation policy.
- As an admin, I want a `long only` mode so I can exclude YouTube Shorts without manually reviewing every video.
- As an admin, I want a `selected only` mode so I can review videos individually when a source channel is only partially suitable.
- As an admin, I want newly imported videos in `selected only` mode to remain unreviewed and excluded until I decide what to do with them.
- As an admin, I want to filter videos by regex and by long/short classification and then apply bulk selection actions to the visible subset so I can review large channels efficiently.
- As an admin, I want to see small thumbnails in the management list so I can identify videos faster without turning the page into an image-heavy gallery.

## 4. Functional Requirements

1. The system must provide a dedicated admin page for managing an existing virtual channel after the channel has been created.
2. The existing virtual-channel creation flow may remain minimal and only collect the virtual channel name.
3. The manage page must show the list of source-channel associations currently attached to the virtual channel.
4. The manage page must allow the admin to add an association from the set of existing imported source channels.
5. The add-source flow should prioritize selecting from existing channels and may link to a separate channel-creation/import flow rather than embedding full import directly into the page.
6. The system must allow the same source channel to be associated with multiple virtual channels.
7. Each virtual-channel/source-channel association must store its mode independently from all other associations.
8. Each association must support exactly one of three modes: `all`, `long only`, or `selected only`.
9. For an `all` association, all videos from the source channel must be treated as included in that virtual channel.
10. For a `long only` association, only videos classified as long by YouTube's long/short categorization must be treated as included.
11. If long/short status is unavailable or ambiguous, the UI must show that status as unknown and allow the admin to review it manually rather than silently forcing inclusion or exclusion.
12. For `all` and `long only` associations, the manage page must provide an expandable panel that lists the videos automatically included because of that association.
13. The automatic-inclusion panel should show a readable long list on one page without forcing pagination in the first version.
14. For `selected only` associations, the manage page must provide an expandable panel listing all videos from the source channel, not only currently included ones.
15. Each video row in a `selected only` panel must show a small thumbnail and enough metadata to identify the video reliably.
16. Each video in a `selected only` association must support a ternary review state of `included`, `ignored`, or `not yet reviewed`.
17. The default state for newly appearing videos in a `selected only` association must be `not yet reviewed`.
18. Videos in `not yet reviewed` state must be excluded from the virtual channel until they are explicitly reviewed.
19. The `selected only` UI must provide a filter to show only videos in `not yet reviewed` state.
20. The `selected only` UI must provide temporary filtering by regex.
21. Regex filtering must match against video title and description.
22. The `selected only` UI must provide filtering by video type, including long and short where classification data is available.
23. The `selected only` UI must provide bulk actions for the currently shown subset, including at least select all shown and select none shown.
24. Bulk selection controls are temporary UI actions only and must not create saved or reusable rules.
25. The system must persist selected-only review states per virtual-channel/source-channel association rather than globally per source channel.
26. The data model may be replaced directly to support this feature, and backward compatibility with the current local database contents is not required.
27. The feature must not change viewer routes, viewer behavior, or viewer-specific presentation in this phase.

## 5. Non-Goals

- Changes to the viewer UI or viewer filtering behavior
- Saved or reusable selection rules such as permanent regex-based inclusion policies
- Explicit ordering controls for videos or associations
- Thumbnail processing, cropping, or image optimization beyond using existing provided thumbnails
- Audit logs or history of admin selection changes
- Inline source-channel import creation inside the manage virtual channel page
- Forced pagination as the default approach for large management lists

## 6. Design Considerations

- The manage-virtual-channel page should make association-level mode and inclusion behavior obvious at a glance.
- Expand/collapse behavior should keep the page readable while still making detailed inspection available inline.
- The video-review UI should favor dense, practical list presentation over card-heavy layouts.
- Small thumbnails should aid recognition without dominating the list.
- Bulk tools should be visible near the filtered list they affect so the scope of each action is obvious.
- Unknown long/short classification should be surfaced clearly to avoid hidden curation mistakes.

## 7. Technical Considerations

- The existing database can be replaced rather than migrated incrementally for this feature.
- The schema will need to represent virtual-channel/source-channel associations and per-association selected-video review state.
- The implementation should rely on YouTube's own long/short categorization when that data is available from the stored metadata or import process.
- Because viewer behavior is out of scope, this feature may introduce data structures that are only consumed by admin flows for now.
- The first version may render full lists directly on the page instead of adding pagination, with performance optimization deferred unless list size becomes a practical blocker during implementation.

## 8. Success Metrics

- An admin can create a virtual channel, open its management page, and attach source channels with the intended mode.
- An admin can see which videos are automatically included for `all` and `long only` associations.
- An admin can review a large source channel in `selected only` mode and classify videos without repeated page transitions.
- Newly imported videos in `selected only` mode are clearly visible as unreviewed and do not leak into the curated channel accidentally.
- The same source channel can be reused across multiple virtual channels with different association settings and independent video selections.

## 9. Clarifications Applied

- This feature is admin-only for now and does not modify the viewer UI.
- Virtual channel creation remains a simple name-only flow; detailed setup happens on a dedicated management page.
- The same source channel may be associated with multiple virtual channels, and each association has its own mode and selections.
- `Selected only` uses a ternary review model of included, ignored, and not yet reviewed.
- Newly imported videos for `selected only` default to not yet reviewed and remain excluded until reviewed.
- Bulk tools are temporary controls applied to the current filtered list only; saved rules are out of scope.
- Regex filtering applies to video title and description.
- Long/short filtering should use YouTube's categorization where available.
- If long/short categorization is unavailable or ambiguous, the video should be surfaced as unknown for manual review rather than auto-classified.
- Full long lists are acceptable for the first version; pagination is intentionally avoided.
- The existing local database contents do not need to be preserved for this feature.

## 10. Open Questions

- What exact YouTube metadata source in the current application is best suited to represent Shorts vs long classification reliably?
- Should unknown long/short status be filterable as its own explicit category in the admin UI, or is surfacing it visually enough for V1?
- Should bulk actions in `selected only` support setting rows directly to `ignored` as well as `included` and clearing back to `not yet reviewed`?
