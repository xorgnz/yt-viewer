# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Prerequisites

- A feature tag must exist (created via rule `0-create-feature-tag.md`)
- A scope file should exist at `tasks/{feature-tag}-scope.md`

## Process

1.  **Identify Feature Tag:** Confirm which feature you're creating a PRD for by identifying the feature tag.
2.  **Check for Scope File:** Look for the scope file at `ai-work/{feature-tag}-scope.md`. If it exists, read it to understand the initial feature request and any pre-existing context.
3.  **Receive Initial Prompt:** If no scope file exists, the user provides a brief description or request for a new feature or functionality.
4.  **Ask Clarifying Questions:** Before writing the PRD, the AI *must* ask only the most essential clarifying questions needed to write a clear PRD. Limit questions to 3-5 critical gaps in understanding. The goal is to understand the "what" and "why" of the feature, not necessarily the "how" (which the developer will figure out). Make sure to provide options in letter/number lists so I can respond easily with my selections.
5.  **Document Q&A in Scope File:** After receiving answers to the clarifying questions, append a section to the scope file (create it at `ai-work/{feature-tag}-scope.md` if it doesn't exist) that documents both the questions asked and the answers received. This creates a permanent record of the decision-making process.
6.  **Generate PRD:** Based on the initial prompt/scope file and the user's answers to the clarifying questions, generate a PRD using the structure outlined below.
7.  **Save PRD:** Save the generated document as `{feature-tag}-prd.md` inside the `/ai-work` directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear PRD. Focus on areas where the initial prompt is ambiguous or missing essential context. Common areas that may need clarification:

*   **Problem/Goal:** If unclear - "What problem does this feature solve for the user?"
*   **Core Functionality:** If vague - "What are the key actions a user should be able to perform?"
*   **Scope/Boundaries:** If broad - "Are there any specific things this feature *should not* do?"
*   **Success Criteria:** If unstated - "How will we know when this feature is successfully implemented?"

**Important:** Only ask questions when the answer isn't reasonably inferable from the initial prompt. Prioritize questions that would significantly impact the PRD's clarity.

### Formatting Requirements

- **Number all questions** (1, 2, 3, etc.)
- **List options for each question as A, B, C, D, etc.** for easy reference
- Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Generate additional revenue

2. Who is the target user for this feature?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the expected timeline for this feature?
   A. Urgent (1-2 weeks)
   B. High priority (3-4 weeks)
   C. Standard (1-2 months)
   D. Future consideration (3+ months)
```

## PRD Structure

The generated PRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2.  **Goals:** List the specific, measurable objectives for this feature.
3.  **User Stories:** Detail the user narratives describing feature usage and benefits.
4.  **Functional Requirements:** List the specific functionalities the feature must have. Use clear, concise language (e.g., "The system must allow users to upload a profile picture."). Number these requirements.
5.  **Non-Goals (Out of Scope):** Clearly state what this feature will *not* include to manage scope.
6.  **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
7.  **Technical Considerations (Optional):** Mention any known technical constraints, dependencies, or suggestions (e.g., "Should integrate with the existing Auth module").
8.  **Success Metrics:** How will the success of this feature be measured? (e.g., "Increase user engagement by 10%", "Reduce support tickets related to X").
9.  **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the PRD is a **junior developer**. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the feature's purpose and core logic.

## Output

*   **Scope File:**
    *   **Format:** Markdown (`.md`)
    *   **Location:** `/ai-work/`
    *   **Filename:** `{feature-tag}-scope.md` (e.g., `01-user-auth-scope.md`)
    *   **Contents:** Initial feature request, clarifying questions, and user's answers
*   **PRD File:**
    *   **Format:** Markdown (`.md`)
    *   **Location:** `/ai-work/`
    *   **Filename:** `{feature-tag}-prd.md` (e.g., `01-user-auth-prd.md`)

## Final instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions
3. Document both the questions and answers in the scope file (`tasks/{feature-tag}-scope.md`)
4. Take the user's answers to the clarifying questions and improve the PRD