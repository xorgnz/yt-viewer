---
version: 1.3.1
timestamp: 2026-04-04 10:45
---
# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document in Markdown format for the active feature, based on the scope and the user's clarifications.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active`
- The feature must not be marked `paused` or `completed`
- A scope file should exist at `/ai-work/{feature-tag}-scope.md`
- Follow the shared feature-state contract in `/ai-work/00-feature-status.md`

## Process

### Inspect

1. **Identify the Active Feature**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature as the default source of truth

2. **Read the Scope**
   - Check for `/ai-work/{feature-tag}-scope.md`
   - Use it as the high-level boundary document

3. **Ask Essential Clarifying Questions**
   - Ask only the 3-5 most important unresolved questions
   - Provide numbered questions and easy response options

### Propose

4. **Generate the PRD Draft**
   - Write the PRD using the established structure
   - Capture the important clarifications inside the draft
   - If two or more plausible interpretations remain, do not infer
   - Present the top candidate interpretations briefly and ask the user to choose

### Execute Draft Write

5. **Save the Draft PRD**
   - Save the draft to `/ai-work/{feature-tag}-prd.md`
   - Mark the document clearly as a draft until the user approves it
   - Report that the draft PRD was written and identify the target file

### Approval Gate

6. **Wait for Explicit Approval to Finalize**
   - Refine the draft with the user as needed
   - Do not treat the PRD as finalized until the user explicitly approves the draft
   - Ask `Approve this? Y/N.` when the draft is ready to finalize

### Finalize and Report

7. **Finalize the PRD**
   - Update `/ai-work/{feature-tag}-prd.md` to remove any draft marker once approved
   - Report that the PRD was finalized

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
4. Write the first PRD draft to the file and mark it as draft status before refinement
5. Do not create or update PRDs for paused or completed features unless the user explicitly asks for an exception
6. Require explicit approval before treating the PRD as final
