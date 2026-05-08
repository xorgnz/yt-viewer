# Project Scope: Inline Assignment Controls

## Overview

This feature streamlines the admin workflow for managing which source channels are attached to each virtual channel. Instead of requiring separate navigation to inspect or adjust basic associations, the virtual channels page should surface the current source-channel list inline and allow quick add/remove actions in place.

The goal is to reduce unnecessary clicks for common admin work while preserving the deeper manage page for mode-specific configuration, review workflows, filtering, and bulk actions. This feature focuses on lightweight inline assignment management for already imported source channels.

## Problem Statement

The current admin workflow spreads simple source-channel assignment work across too many steps and pages. For common tasks like checking which source channels are attached to a virtual channel, adding one imported source channel, or removing one association, the extra navigation adds unnecessary friction.

## Target Users

- Primary: the admin user managing virtual-channel composition
- Secondary: future maintenance workflows that benefit from a clearer, lower-friction admin surface

## Core Objectives

1. Show associated source channels directly on the virtual channels admin page.
2. Allow quick inline attachment of already imported source channels to a virtual channel.
3. Allow immediate inline removal of source-channel associations with confirmation.

## In Scope

- Inline display of associated source-channel names for each virtual channel on the admin list page
- Inline add-association control using a dropdown of already imported source channels
- Inline remove-association action with confirmation
- Server-side support for inline add/remove actions on the virtual channels page
- Preserving the dedicated manage page for deeper per-association work

## Explicitly Out of Scope

- Removing the standalone assignments page in this feature
- Moving selected-only review tools, filters, or bulk actions onto the virtual channels list page
- Inline source-channel import or creation from the add control
- Inline association mode editing on the virtual channels list page

## Assumptions and Constraints

- Only already imported source channels should be available in the inline add control
- The dedicated manage page remains available for detailed configuration
- Remove actions should be immediate but require confirmation
- This feature is intended to simplify the admin workflow and reduce clicks, not replace the deeper management UI

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope
- [ ] Generate task breakdown
