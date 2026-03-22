---
version: 1.0.0
timestamp: 2026-02-27 15:40
---
# Rule: Technology Stack Selection and Documentation

## Goal

To guide an AI assistant in evaluating technical requirements from the PRD, proposing appropriate technology options, facilitating user decision-making, and documenting technology choices with minimal duplication across features.

## When to Use

This rule should be executed **after** creating the PRD (step 3) and **before** creating the task list (step 5). It serves as step 4 in the development workflow.

## Prerequisites

- A feature tag must exist (created via rule `1-create-feature-tag.md`)
- A completed PRD document exists in `/ai-work/{feature-tag}-prd.md`
- The master technology stack should be treated as the primary application-wide source of truth at `/ai-work/00-master-techstack.md` if it exists

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/ai-work/`
- **Filename:** `00-master-techstack.md`

## Process

### 1. Analyze Technical Requirements

Review the PRD to identify:
- Core functionality requirements
- Performance and scalability needs
- Integration requirements (APIs, databases, third-party services)
- User interface requirements
- Testing and deployment needs
- Development environment constraints
- Security and compliance requirements

Also compare the feature requirements against `/ai-work/00-master-techstack.md` if it exists:
- Identify which needs are already covered by the shared application stack
- Identify only genuinely new technologies, dependencies, or architectural layers required by this feature

### 2. Identify Technology Decision Points

For each category, identify where technology choices need to be made:
- **Frontend Framework** (e.g., React, Vue, Svelte, vanilla JS)
- **Backend Framework** (e.g., Express, Fastify, Nest.js, Next.js API routes)
- **Database** (e.g., PostgreSQL, MongoDB, SQLite, Redis)
- **State Management** (e.g., Redux, Zustand, Context API, MobX)
- **Styling Solution** (e.g., CSS Modules, Tailwind, styled-components, Sass)
- **Testing Framework** (e.g., Jest, Vitest, Playwright, Cypress)
- **Build Tools** (e.g., Vite, Webpack, Turbopack, esbuild)
- **Package Manager** (e.g., npm, yarn, pnpm)
- **Other Libraries/Tools** as needed by the specific feature

### 3. Propose Technology Options

For each decision point, present:
- **2-3 viable options** with brief descriptions
- **Pros and cons** relevant to the project requirements
- **Recommendation** with rationale based on:
  - Project requirements and constraints
  - Team experience (if known)
  - Community support and ecosystem maturity
  - Performance characteristics
  - Development velocity impact

### 4. Present to User

Format the proposal as a clear, scannable document:

```markdown
## Technology Decision: [Category Name]

**Requirement:** [Why this technology choice is needed]

### Option 1: [Technology Name]
- **Pros:** [List key advantages]
- **Cons:** [List key disadvantages]
- **Use Case Fit:** [How well it matches requirements]

### Option 2: [Technology Name]
- **Pros:** [List key advantages]
- **Cons:** [List key disadvantages]
- **Use Case Fit:** [How well it matches requirements]

### Recommendation
[Your recommendation with clear reasoning]

**Your Choice:** _[User fills this in]_
```

### 5. Facilitate User Decision

- Present all technology decisions in a single document
- Allow the user to:
  - Accept recommendations as-is
  - Choose alternative options from the proposals
  - Specify their own preferences not listed
- **Wait for user confirmation** before proceeding to documentation

### 6. Document Final Choices With Minimal Duplication

Once the user has made all decisions:

- If the feature introduces a new application-wide technology, dependency, or architectural layer, update `/ai-work/00-master-techstack.md`
- For each master stack entry, record which feature first required it using a field such as `First Required By`

### 6A. Master Tech Stack Structure

```markdown
# Master Technology Stack: [Project Name]

**Created:** [Date]
**Status:** Approved baseline

## Overview

Brief description of the shared application stack.

## Technology Decisions

### [Category 1]
- **Choice:** [Selected Technology]
- **Rationale:** [Why this was chosen]
- **Version:** [If applicable]
- **First Required By:** [Feature tag]

### [Category 2]
- **Choice:** [Selected Technology]
- **Rationale:** [Why this was chosen]
- **Version:** [If applicable]
- **First Required By:** [Feature tag]

[Continue for all categories...]

## Development Environment

- **Node Version:** [e.g., 20.x]
- **Package Manager:** [e.g., npm]
- **IDE/Editor:** [If specified]

## Dependencies

### Core Dependencies
```json
{
  "[package-name]": "[version]",
  "[package-name]": "[version]"
}
```

### Development Dependencies
```json
{
  "[package-name]": "[version]",
  "[package-name]": "[version]"
}
```

## Architecture Notes

[Any additional notes about how these technologies will work together, architectural patterns to follow, or important implementation considerations]

## Future Considerations

[Technologies or patterns to consider for future iterations]
```

### 7. Save and Confirm

- Save the updated `00-master-techstack.md` if any shared technology decisions changed
- Confirm with the user whether the feature added anything new to the master stack
- Note that implementation should use the master stack as the source of truth

## Interaction Model

1. **Analysis Phase:** AI reviews PRD silently
2. **Proposal Phase:** AI presents technology options with recommendations
3. **Decision Phase:** User reviews and makes choices (may be iterative with discussion)
4. **Documentation Phase:** AI updates the master stack if needed
5. **Confirmation:** AI confirms completion and readiness to proceed to task implementation

## Important Notes

- **Don't overwhelm:** Only propose decisions for technologies actually needed by the project
- **Be pragmatic:** Consider existing project setup if this is adding to an existing codebase
- **Avoid duplication:** Reuse the master stack whenever possible and only document deltas at the feature level
- **Stay current:** Recommend stable, well-supported technologies unless cutting-edge features are required
- **Document constraints:** If certain choices are constrained by existing decisions, note this clearly
- **Version awareness:** Specify version ranges when important for compatibility

## Example Workflow

```
User: "I've got my PRD for feature 01-user-auth. Let's pick the tech stack."

AI: [Analyzes requirements from 01-user-auth-prd.md]
AI: "Based on your requirements for user authentication, I've identified 5 key technology decisions. Let me present the options..."
AI: [Presents formatted document with options and recommendations]

User: "I'll go with your recommendations for everything except the database - use PostgreSQL instead of SQLite."

AI: [Updates 00-master-techstack.md with any new shared decisions]
AI: "Technology stack documented. The master stack was updated with PostgreSQL as first required by 01-user-auth.

Ready to proceed to task creation (step 5)?"
```

## Target Audience

This rule helps both:
- **AI Assistant:** To systematically evaluate options and present clear recommendations
- **Developer/User:** To make informed technology choices that will guide the entire implementation
