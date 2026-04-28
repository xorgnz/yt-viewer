---
version: 1.6.2
timestamp: 2026-04-17 09:22
---
# Rule: Generating a Product Requirements Document (PRD)

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active` or an explicitly selected `planned` feature
- The feature must not be marked `paused` or `completed`
- A scope file must exist at `/ai-work/{feature-tag}-scope.md`

## Process

### Inspect

1. **Identify the Feature**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature as the default source of truth
   - If the user names a different feature and it is `planned`, PRD creation may proceed without activating that feature
   - If the user names a different feature and it is `paused` or `completed`, stop and tell the user rule 3 does not run on that feature state
   - Only require the feature-change workflow when the user wants a different feature to become the active working feature

2. **Read the Scope**
   - Check for `/ai-work/{feature-tag}-scope.md`
   - Use it as the high-level upstream boundary document
   - Carry the important scope boundaries forward into the PRD so implementation does not depend on reopening the scope file

3. **Ask Essential Clarifying Questions**
   - Ask only the 3-5 most important unresolved questions
   - Provide numbered questions and easy response options

### Propose

4. **Generate the PRD Proposal**
   - Write the PRD using a structure that matches the feature complexity
   - Include the essential scope material directly in the PRD, especially feature intent, in-scope areas, out-of-scope areas, and key assumptions or constraints
   - Capture the important clarifications inside the proposed PRD
   - If two or more plausible interpretations remain, do not infer
   - Present the top candidate interpretations briefly and ask the user to choose

### Approval Gate

5. **Wait for Explicit Approval**
   - Refine the proposal with the user as needed
   - Do not write `/ai-work/{feature-tag}-prd.md` until the user explicitly approves the proposal
   - Make the approval target explicit: approving writes the shown PRD content to `/ai-work/{feature-tag}-prd.md`
   - Ask `Approve this? Y/N.` when the proposal is ready to write

### Execute and Report

6. **Save the Approved PRD**
   - Save the approved PRD to `/ai-work/{feature-tag}-prd.md`
   - Report that the PRD was written and identify the target file

## PRD Structure Guidance

Every PRD should cover these core elements:

1. Overview
2. Goals
3. Scope boundaries
4. Requirements
5. Constraints and considerations

The `Scope boundaries` section should make the PRD implementation-facing on its own. It should briefly capture:

- What is in scope
- What is out of scope
- Key assumptions and constraints that materially affect implementation

Add more detailed sections when they materially improve execution clarity. Useful optional sections include:

- User stories
- Non-goals
- Design considerations
- Technical considerations
- Technical context or applicable tech stack decisions when `/ai-work/00-master-techstack.md` materially affects the feature
- Success metrics
- Clarifications applied
- Open questions
- Risks, assumptions, dependencies, rollout notes, or similar project-specific sections
