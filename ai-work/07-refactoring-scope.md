# Project Scope: Repository Refactoring

## Overview

This feature focuses on improving the application's internal architecture so future work can be delivered with less duplication, lower coupling, and clearer module boundaries. The refactor is intentionally broad across UI, route/server code, data access, integration code, and test infrastructure because the current architectural pressure points cut across those layers rather than living in one isolated area.

The goal is not cosmetic cleanup. The goal is to reorganize responsibilities so route files stop owning business workflows, large UI/state modules become easier to reason about, shared infrastructure becomes reusable, and integration code becomes better encapsulated. Moderate restructuring is acceptable as long as user-facing behavior remains effectively equivalent.

## Problem Statement

The codebase has accumulated several architectural hotspots that now make change harder than it needs to be. Large viewer modules, repeated route/server setup patterns, mixed business and persistence logic, and overlapping integration responsibilities reduce modularity and reuse. This increases maintenance cost, makes testing more fragile, and raises the risk of regressions when adding features or changing existing behavior.

## Target Users

- Primary: developers working on future features in this repository
- Secondary: maintainers who need clearer architectural boundaries, safer reuse, and more focused tests

## Core Objectives

1. Improve modularity by separating UI, route orchestration, business workflows, persistence concerns, and integration logic.
2. Improve encapsulation by moving repeated or cross-cutting responsibilities behind explicit shared modules and service boundaries.
3. Improve reuse by consolidating duplicated infrastructure, helper logic, and test setup into shared utilities.
4. Reduce the size and responsibility load of the most complex modules.
5. Leave the application behavior effectively equivalent while making future refactoring and feature work easier.

## In Scope

- Refactoring oversized viewer modules and related state-management logic
- Consolidating repeated route/server infrastructure such as environment mode resolution, database access setup, and profile/session resolution
- Introducing clearer service-layer boundaries for business workflows currently embedded in route handlers
- Separating query construction, read-model shaping, and persistence concerns where DAOs currently mix them
- Refining YouTube integration boundaries to separate transport, orchestration, and persistence application
- Improving shared database bootstrap, migration, and related infrastructure boundaries where reuse can be strengthened
- Consolidating test helpers and fixture setup for persistence and migration scenarios
- Removing obsolete code paths when replacement behavior is complete and verified

## Explicitly Out of Scope

- Major new end-user features unrelated to architectural cleanup
- Intentional product redesign or feature expansion beyond what is needed to support the refactor
- Large user-facing behavior changes as a goal in themselves
- Replacing the application's core stack or framework choices
- Open-ended cleanup with no architectural rationale

## Assumptions and Constraints

- The refactor may span UI, routes, services, DAOs, integration code, and tests in the same feature.
- Moderate restructuring is acceptable as long as user-facing behavior remains effectively equivalent.
- Refactoring should be phased so work can land in coherent chunks rather than one unsafe rewrite.
- Obsolete code may be removed, but only when the replacement path is clearly complete.
- The feature should prioritize architectural leverage points with the highest payoff for future development speed and code quality.
