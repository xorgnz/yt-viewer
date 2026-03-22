---
version: 1.0.0
timestamp: 2026-02-27 15:40
---
# Rule: Creating a High-Level Project Scope

## Goal

To guide an AI assistant in working with the user to create a concise, high-level scope document that captures why a feature exists and where its boundaries are before diving into detailed requirements.

## Prerequisites

- A feature tag must be created first using rule `1-create-feature-tag.md`
- The feature tag format is `{NN}-{identifier}` (e.g., `01-user-auth`)

## Process

1.  **Receive Initial Request:** The user provides a brief idea, feature request, or project concept.
2.  **Create or Confirm Feature Tag:** If not already created, generate a feature tag following rule `1-create-feature-tag.md`. If a tag exists, confirm which feature you're working on.
3.  **Ask Discovery Questions:** Guide the user through a structured set of discovery questions to understand the vision, constraints, and boundaries. Use the question framework below.
4.  **Summarize Understanding:** After receiving answers, provide a concise summary of what you understand and ask for confirmation or corrections.
5.  **Generate Scope Document:** Create a short, high-level scope document using the template structure below.
6.  **Save Scope Document:** Save the document as `{feature-tag}-scope.md` in the `/ai-work` directory.

## Discovery Questions Framework

Ask 5-7 questions maximum, focusing on these key areas:

### Vision & Purpose
- What problem are you trying to solve?
- Who is this for? (target users/audience)
- What's the core value this will provide?

### Scope & Boundaries
- What are the 3 most important things this must do?
- What is explicitly out of scope for this version?
- Are there any existing systems or features this needs to work with?

### Context & Constraints
- What's the timeline/urgency? (Rough estimate)
- Are there any technical constraints or preferences?
- What does success look like?

### Formatting Requirements

- **Number all questions** (1, 2, 3, etc.)
- **Provide multiple choice options (A, B, C, D)** where applicable to make responses easier
- Allow for write-in answers when options are too limiting
- Group related questions together

### Example Question Set

```
1. What is the primary problem you're trying to solve?
   A. Users can't efficiently [do something]
   B. Current process is too manual/time-consuming
   C. We need to support a new use case
   D. Other (please describe)

2. Who is the primary user/audience?
   A. End users (customers)
   B. Internal team members
   C. Administrators/power users
   D. Multiple user types

3. What are the top 3 must-have features? (Rank in order)
   [Free-form response]

4. What should explicitly NOT be included in this version?
   [Free-form response]

5. How urgent is this project?
   A. Critical - needed within 1-2 weeks
   B. High priority - needed within 1 month
   C. Standard - can take 1-3 months
   D. Low priority - nice to have, flexible timeline

6. Are there existing systems this needs to integrate with?
   A. Yes (please specify)
   B. No, this is standalone
   C. Not sure yet

7. How will you know this is successful?
   [Free-form response]
```

## Scope Document Template

```markdown
# Project Scope: [Feature/Project Name]

## Overview

[1-2 paragraph summary of what this is and why it matters]

## Problem Statement

[Clear description of the problem being solved]

## Target Users

[Who this is for]

## Core Objectives

1. [Primary objective]
2. [Secondary objective]
3. [Tertiary objective]

## In Scope

- [Feature 1]
- [Feature 2]
- [Feature 3]
- [Feature 4]

## Explicitly Out of Scope

- [What will NOT be included]
- [What will NOT be included]
- [What will NOT be included]

## Assumptions and Constraints

- [Important assumption or boundary]
- [Important assumption or boundary]

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope with stakeholders
- [ ] Generate task breakdown
```

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/ai-work/`
*   **Filename:** `{feature-tag}-scope.md` (e.g., `01-user-auth-scope.md`)

## Interaction Style

- Be conversational and collaborative
- Ask questions one at a time or in small groups (max 3 at once)
- Acknowledge and reflect back what you're hearing
- If an answer is vague, ask gentle follow-up questions
- Summarize understanding before finalizing the document

## Final Instructions

1. Keep the scope high-level - avoid diving into implementation details
2. Focus on "what" and "why", not "how"
3. Help the user think through boundaries and constraints
4. Do not turn the scope file into a detailed notes log or requirements document
5. Do NOT proceed to create a PRD unless explicitly asked
