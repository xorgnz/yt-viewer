---
version: 1.5.0
timestamp: 2026-04-08 11:05
---
# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a clear, implementation-relevant Product Requirements Document in Markdown format for the active feature or an explicitly selected planned feature, based on the scope and the user's clarifications.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active` or an explicitly selected `planned` feature
- The feature must not be marked `paused` or `completed`
- A scope file should exist at `/ai-work/{feature-tag}-scope.md`
- Follow the shared feature-state contract in `/ai-work/00-feature-status.md`

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
   - Use it as the high-level boundary document

3. **Ask Essential Clarifying Questions**
   - Ask only the 3-5 most important unresolved questions
   - Provide numbered questions and easy response options

### Propose

4. **Generate the PRD Proposal**
   - Write the PRD using a structure that matches the feature complexity
   - Capture the important clarifications inside the proposed PRD
   - If two or more plausible interpretations remain, do not infer
   - Present the top candidate interpretations briefly and ask the user to choose

### Approval Gate

5. **Wait for Explicit Approval**
   - Refine the proposal with the user as needed
   - Do not write `/ai-work/{feature-tag}-prd.md` until the user explicitly approves the proposal
   - Ask `Approve this? Y/N.` when the proposal is ready to write

### Execute and Report

6. **Save the Approved PRD**
   - Save the approved PRD to `/ai-work/{feature-tag}-prd.md`
   - Report that the PRD was written and identify the target file

## PRD Structure Guidance

Every PRD should cover these core elements:

1. Overview
2. Goals
3. Requirements
4. Constraints and considerations

Add more detailed sections when they materially improve execution clarity. Useful optional sections include:

- User stories
- Non-goals
- Design considerations
- Technical considerations
- Success metrics
- Clarifications applied
- Open questions
- Risks, assumptions, dependencies, rollout notes, or similar project-specific sections

## Final Instructions

1. Do not start implementation from this rule
2. Capture the important clarifications inside the PRD
3. Use the scope file as the concise boundary document
4. Keep the PRD as lean as possible while still giving implementation enough direction
5. Add detailed sections only when they improve clarity for the feature at hand
6. Do not create or update PRDs for paused or completed features
7. Allow PRD work for an explicitly selected planned feature without activating it
8. Require explicit approval before writing the PRD file
