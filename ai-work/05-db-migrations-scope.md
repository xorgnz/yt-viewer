# Project Scope: Forward-Only Database Migrations

## Overview

This feature introduces a forward-only migration system for the application's persisted data so prior deployments can be brought up to the current application design without requiring manual re-entry of content. The system should support both schema changes and data transformations, create automatic backups before user-facing migrations, and fail safely when it encounters an unknown database state.

The migration design should not be tightly coupled to SQLite even though SQLite is the current database engine. The goal is to establish migration concepts, interfaces, and workflow conventions that can survive a future database change with minimal redesign.

## Problem Statement

The current project has relied on destructive database recreation during feature work. That was acceptable while the data model was changing rapidly, but it is no longer acceptable once the application begins holding real user-curated content that should survive iterative releases. Without a proper migration system, any incompatible schema change risks breaking existing deployments or forcing costly manual recovery.

## Target Users

- Primary: the app owner/operator who wants to keep real local data across releases
- Secondary: future development work that needs a disciplined way to evolve persistence safely

## Core Objectives

1. Add a forward-only migration workflow that upgrades existing deployments to the latest supported data design.
2. Support both schema evolution and explicit data transformation steps when needed.
3. Establish migration infrastructure and conventions that are not tightly bound to SQLite-specific assumptions.
4. Require explicit migration execution, automatic backups, and fail-safe handling of unknown database states.

## In Scope

- A migration framework that tracks applied versions and runs forward-only upgrades in order
- Support for both schema changes and data backfills/transforms inside migrations
- Migration support for repository user-data databases: `dev` and `live`
- Explicit command-driven migration execution rather than automatic migration on normal app startup
- Automatic pre-migration backups for databases where data preservation matters
- Clear refusal behavior when a database state is unknown or unsupported
- A migration abstraction boundary that avoids baking SQLite-specific assumptions into the top-level migration design
- Rules and conventions for how future schema-changing features add migrations
- Focus on the migration framework and forward-looking workflow for future changes
- Preserving the current testing model where `test` databases are created fresh rather than migrated in place

## Explicitly Out of Scope

- Broad rescue support for every historical database state ever produced during development
- Silent automatic migration during normal application startup
- Automatic fallback reset behavior when migration compatibility is unknown
- Full cross-database runtime support in this feature
- Replacing SQLite as the active database engine in this feature
- Retrofitting every previously shipped schema change unless explicitly selected later as a follow-up task

## Assumptions and Constraints

- Forward-only migration is the supported upgrade model; downgrade support is not required
- Unknown or ambiguous database states should fail explicitly rather than being guessed at
- Automatic backups should happen before commanded migrations because local SQLite backup is straightforward
- The first implementation may still use SQLite-specific execution details internally, but the migration model and interfaces should remain portable
- Migration execution should be traceable, deterministic, and testable in isolation
- Existing historical gaps may be addressed selectively later, but this feature should prioritize a solid baseline for future releases
- `test` databases should continue to be disposable and recreated from the latest schema for each run rather than upgraded through migration history

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope
- [ ] Generate task breakdown
