---
version: 1.4.0
timestamp: 2026-04-19 00:00
---
# Rule: Creating a High-Level Project Scope

## Prerequisites

- A feature tag must already exist
- `/ai-work/00-feature-status.md` must identify the feature as the current active feature, an explicitly selected planned feature, or an explicitly selected future feature

## Process

### Inspect

1. **Confirm the Feature**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature by default
   - If the user names a different feature and it is `planned`, scope creation may proceed without activating that feature
   - If the user explicitly names a `future` feature, scope creation may proceed without activating that feature
   - If the user names a different feature and it is `paused`, `completed`, or `archived`, only proceed if they explicitly ask for an exception
   - Only require the feature-change workflow when the user wants a different feature to become the active working feature
   - Do not bring future features into scope planning for other features unless the user explicitly names the future feature as relevant

2. **Ask Discovery Questions**
   - Guide the user through a focused set of questions about vision, boundaries, and constraints
   - Ask 5-7 questions maximum

### Propose

3. **Summarize Understanding**
   - Reflect the intended scope back to the user and confirm the understanding
   - If two or more plausible interpretations remain, do not infer
   - Present the top candidate interpretations briefly and ask the user to choose

4. **Generate the Scope Draft**
   - Create a short, high-level scope document using the template below
   - Present the draft or summary for approval before writing the file

### Approval Gate

5. **Wait for Explicit Approval**
   - Do not write `/ai-work/{feature-tag}-scope.md` until the user explicitly approves the summary or draft
   - Make the approval target explicit: approving writes the shown scope content to `/ai-work/{feature-tag}-scope.md`
   - Ask `Approve this? Y/N.` after presenting the summary or draft

### Execute and Report

6. **Save the Scope Document**
   - Save it to `/ai-work/{feature-tag}-scope.md`
   - Report that the scope was written and identify the target file

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
```

## Example Interaction Flow

```text
User: "Create scope for planned feature 03-user-auth"

AI: [Reads 00-feature-status.md]
AI: [Confirms 03-user-auth exists and is planned]
AI: [Asks discovery questions]
AI: [Summarizes the scope]
AI: [Shows a draft for approval]
AI: "Feature `03-user-auth` remains planned. I can write the approved scope without activating it."
```
