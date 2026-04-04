---
version: 1.2.1
timestamp: 2026-04-04 10:00
---
# Rule: Creating a High-Level Project Scope

## Goal

To guide an AI assistant in working with the user to create a concise, high-level scope document that captures why a feature exists and where its boundaries are before detailed requirements are written.

## Prerequisites

- A feature tag must already exist
- `/ai-work/00-feature-status.md` must identify the feature as the current active feature or an explicitly selected planned feature
- The feature must not be marked `paused` or `completed` unless the user explicitly asks for an exception

## Process

1. **Confirm the Feature**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature by default
   - If the user names a different feature and it is `planned`, scope creation may proceed without activating that feature
   - If the user names a different feature and it is `paused` or `completed`, only proceed if they explicitly ask for an exception
   - Only require the feature-change workflow when the user wants a different feature to become the active working feature

2. **Ask Discovery Questions**
   - Guide the user through a focused set of questions about vision, boundaries, and constraints

3. **Summarize Understanding**
   - Reflect the intended scope back to the user and confirm the understanding

4. **Generate the Scope Document**
   - Create a short, high-level scope document using the template below

5. **Save the Scope Document**
   - Save it to `/ai-work/{feature-tag}-scope.md`

## Discovery Questions Framework

Ask 5-7 questions maximum, focusing on:

- Vision and purpose
- Scope and boundaries
- Context and constraints

## Scope Document Template

```markdown
# Project Scope: [Feature Name]

## Overview

[1-2 paragraph summary]

## Problem Statement

[Problem being solved]

## Target Users

[Who this is for]

## Core Objectives

1. [Primary objective]
2. [Secondary objective]
3. [Tertiary objective]

## In Scope

- [Feature area]
- [Feature area]

## Explicitly Out of Scope

- [Out-of-scope item]
- [Out-of-scope item]

## Assumptions and Constraints

- [Constraint or assumption]
- [Constraint or assumption]

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope
- [ ] Generate task breakdown
```

## Final Instructions

1. Keep the scope high-level
2. Focus on what and why, not how
3. Do not create or update scope files for paused or completed features unless the user explicitly asks to make an exception
4. Do not proceed to create a PRD unless explicitly asked
