# Project Scope: Video Multi-Select

## Overview

This feature adds multi-selection to the viewer video list so a user can select many videos and apply flag changes in bulk instead of repeating the same action card by card. The goal is to make large-scale curation practical while keeping the viewer flow simple and predictable.

The first version should support additive and range selection with mouse modifiers, visible selected-state feedback on cards, a bulk-action bar with selection metadata, and bulk updates for watched, favorite, and ignored flags. Selection should be usable across pagination, but should clear when the filter set changes.

## Problem Statement

The current viewer only supports flag changes one video at a time. This makes common curation work slow and repetitive when the user wants to apply the same flag change to many videos.

## Target Users

Users managing or reviewing large sets of videos in the main viewer.

## Core Objectives

1. Reduce repetitive one-by-one flag changes in the viewer.
2. Make multi-selection behavior clear through visible selection affordances and bulk-action controls.
3. Support practical batch workflows across filtered and paginated video lists.

## In Scope

- Multi-selection in the viewer using mouse modifier behavior, including range selection and additive selection.
- Bulk actions for watched, favorite, and ignored flags.
- Cross-pagination selection support within the current result set.
- A visible selected-state treatment on cards, including blue outline and blue checkmark style feedback.
- A bulk-action bar that shows selection count and exposes bulk commands.
- Automatic clearing of selection when the active filters change.

## Explicitly Out of Scope

- Keyboard-only multi-selection workflows beyond normal mouse-plus-modifier behavior.
- Broad redesign of the viewer beyond the selection and bulk-action experience.
- Cross-session persistence of selection state.
- Bulk operations outside the viewer video list.

## Assumptions and Constraints

- Windows-style Ctrl additive selection is required; macOS behavior should follow normal platform conventions where practical.
- Filter changes should invalidate the current selection to avoid stale bulk actions.
- Bulk selection should remain understandable even when spanning multiple pages.
- The feature should build on existing viewer flag behavior rather than introducing a separate flag system.
