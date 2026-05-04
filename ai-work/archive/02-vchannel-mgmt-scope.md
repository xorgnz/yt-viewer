# Project Scope: Virtual Channel Management UI

## Overview

This feature adds a more capable admin experience for configuring how virtual channels are composed from source channels and their videos. It exists to let the curator define channel-specific inclusion rules per virtual channel instead of treating every imported source channel the same.

The admin user should be able to manage source-channel associations from a dedicated virtual-channel management page, inspect which videos are included by each association, and manually curate source videos when a selective mode is needed. This feature focuses on management workflows and local data shape updates only; the viewer experience will consume this model later.

## Problem Statement

The current application does not provide a robust way to control which videos from a source channel appear inside a virtual channel. The user needs per-association controls so a virtual channel can include all videos, exclude YouTube Shorts, or selectively review videos one by one with bulk tools that reduce repetitive admin work.

## Target Users

- Primary: the admin user who curates virtual channels and source-channel associations
- Secondary: future viewer flows that will rely on this curated configuration, without changing in this feature

## Core Objectives

1. Provide a dedicated admin page for managing each virtual channel's source-channel associations and inclusion mode.
2. Support three association behaviors per virtual-channel/source-channel pair: all videos, long videos only, and selected only.
3. Enable efficient review and bulk selection of source videos for selected-only associations, including visibility into newly unreviewed videos.

## In Scope

- A dedicated admin page for managing an existing virtual channel after it is created
- Per-association mode selection for `all`, `long only`, and `selected only`
- Support for the same source channel being associated with multiple virtual channels using different modes and selections
- Expandable panels that show automatically included videos for `all` and `long only` associations
- Expandable panels for `selected only` associations that show source videos with small thumbnails and per-video review state
- Ternary per-video review state for selected-only associations: included, ignored, and not yet reviewed
- Bulk selection tools within the current panel view, including regex filtering, long/short filtering, and select-all/select-none for the currently shown list
- A filter that lets the admin focus on not-yet-reviewed videos
- Data model and schema replacement as needed to support this feature, without preserving the current database contents

## Explicitly Out of Scope

- Changes to the viewer UI or viewer behavior
- Saved or reusable auto-selection rules
- Drag-and-drop ordering or stored manual ordering of videos
- Thumbnail processing, image transformation, or image management beyond using the provided thumbnail
- Audit history for selection or association changes
- Background automation beyond the current manual admin workflow

## Assumptions and Constraints

- The existing virtual-channel creation flow remains minimal and only captures the channel name
- Detailed configuration happens on the dedicated manage-virtual-channel page after creation
- Long-versus-short filtering should use YouTube's own categorization when that data is available
- Selection state is stored per virtual-channel/source-channel association, not globally per source channel
- New videos in selected-only mode should be distinguishable as not yet reviewed
- The current local database can be replaced directly instead of migrated in place for this feature

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope
- [ ] Generate task breakdown
