---
version: 1.2.1
timestamp: 2026-04-04 10:00
---
# Rule: Generating a Task List from User Requirements

## Goal

To guide an AI assistant in creating a detailed, step-by-step task list in Markdown format for the active feature.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active`
- The feature must not be marked `paused` or `completed`
- A PRD should exist at `/ai-work/{feature-tag}-prd.md`
- The master tech stack should exist at `/ai-work/00-master-techstack.md` if technology decisions have already been documented

## Output

- **Format:** Markdown
- **Location:** `/ai-work/`
- **Filename:** `{feature-tag}-tasks.md`

## Process

1. Identify the active feature from `/ai-work/00-feature-status.md`
2. Analyze the PRD and master tech stack
3. Generate the high-level parent tasks first
4. Save the parent-task draft to `/ai-work/{feature-tag}-tasks.md`
5. Wait for the user's explicit `Go`
6. Expand the same file with sub-tasks
7. Identify relevant files, including tests where applicable, and finish the task list in the same file

## Output Format

The task list must include:

- `## Relevant Files`
- `### Notes`
- `## Instructions for Completing Tasks`
- `## Tasks`

Tasks must use markdown checkboxes and hierarchical numbering.

## Final Instructions

1. All task tracking occurs inside `/ai-work/{feature-tag}-tasks.md`
2. Save the parent-task draft first, then pause and wait for the user's `Go` before expanding it
3. Do not generate or revise task lists for paused or completed features unless the user explicitly asks for an exception
