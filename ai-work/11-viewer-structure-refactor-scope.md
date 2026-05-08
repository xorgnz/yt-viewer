# Project Scope: Viewer Structure Refactor

## Overview

This feature refactors the viewer-facing portion of the codebase into clearer module boundaries with class-based structure for non-trivial behavior and state. The goal is to make the code easier to understand, easier to change safely, and less dependent on broad collections of floating functions and loosely related type definitions.

The work focuses first on the viewer surface, but it also includes other parts of the repository where similar structural problems appear. The refactor may reshape internal interfaces aggressively where needed, provided current user-visible behavior is preserved.

## Problem Statement

The current viewer-side code is difficult to understand because behavior is spread across function-heavy modules with weak delineation of responsibility. Selection logic, filter state, page-state helpers, and related viewer behavior are not modular enough, and the same structural issues may exist in other parts of the codebase. This makes ongoing feature work harder and increases the cost and risk of future changes.

## Target Users

The primary user is the maintainer/developer working in the repository. End users benefit indirectly through safer iteration and clearer implementation structure.

## Core Objectives

1. Refactor the viewer layer into clearer class-based boundaries for non-trivial state and behavior.
2. Eliminate or reduce floating-function sprawl in the viewer surface and other similarly affected areas of the codebase.
3. Improve modularity and understandability without intentionally changing viewer behavior.

## In Scope

- `src/lib/viewer/` refactoring
- Viewer-related components and route-layer logic where boundaries are currently weak
- Identification and refactoring of other codebase areas with similar floating-function structural problems
- Aggressive internal interface redesign where needed to improve module boundaries
- One-class-per-file structure in affected areas where behavior/state is non-trivial
- Server-side refactoring when the same structural problems materially affect understanding or maintainability

## Explicitly Out of Scope

- Visual redesign or CSS cleanup
- Intentional product-behavior changes to filtering, selection, watching, or related viewer workflows unless required to preserve current behavior during restructuring
- Starting this refactor before the active `10-timers` feature is complete

## Assumptions and Constraints

- `10-timers` remains the active feature and should finish first.
- Current active feature work should avoid deepening structural tangles that this refactor will later need to unwind.
- Small trivial helpers do not need forced abstraction unless they contribute to the broader boundary problem.
- The refactor is allowed to change internal shapes aggressively if that produces a clearer long-term structure.
