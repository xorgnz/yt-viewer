---
version: 1.2.0
timestamp: 2026-03-22 14:05
---
# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document in Markdown format for the active feature, based on the scope and the user's clarifications.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active`
- The feature must not be marked `paused` or `completed`
- A scope file should exist at `/ai-work/{feature-tag}-scope.md`

## Process

1. **Identify the Active Feature**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature as the default source of truth

2. **Read the Scope**
   - Check for `/ai-work/{feature-tag}-scope.md`
   - Use it as the high-level boundary document

3. **Ask Essential Clarifying Questions**
   - Ask only the 3-5 most important unresolved questions
   - Provide numbered questions and easy response options

4. **Generate the PRD**
   - Write the PRD using the established structure

5. **Save the PRD**
   - Save it to `/ai-work/{feature-tag}-prd.md`

## Required PRD Sections

1. Introduction/Overview
2. Goals
3. User Stories
4. Functional Requirements
5. Non-Goals
6. Design Considerations
7. Technical Considerations
8. Success Metrics
9. Clarifications Applied
10. Open Questions

## Final Instructions

1. Do not start implementation from this rule
2. Capture the important clarifications inside the PRD
3. Use the scope file as the concise boundary document
4. Do not create or update PRDs for paused or completed features unless the user explicitly asks for an exception
