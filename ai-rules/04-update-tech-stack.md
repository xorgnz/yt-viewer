---
version: 1.3.0
timestamp: 2026-04-19 00:00
---
# Rule: Technology Stack Selection and Documentation

## Prerequisites

- The user explicitly identified a feature marked `active`, `planned`, or `future`, or `/ai-work/00-feature-status.md` lists exactly one active feature that can be used by default
- A completed PRD must exist at `/ai-work/{feature-tag}-prd.md` for the selected feature

## Process

1. Read `/ai-work/00-feature-status.md`
2. Use the active feature by default
3. If the user names a different feature and it is `planned`, tech-stack work may proceed without activating that feature
4. If the user explicitly names a `future` feature, tech-stack work may proceed without activating that feature
5. If the user names a different feature and it is `paused`, `completed`, or `archived`, stop and tell the user rule 4 does not run on that feature state
6. Do not bring future features into tech-stack planning for other features unless the user explicitly names the future feature as relevant
7. Review the selected feature PRD
8. If `/ai-work/00-master-techstack.md` exists, treat it as the application-wide technology source of truth and compare needs against it
9. Identify only the technology decision points that actually matter
10. Present 2-3 viable options with a recommendation where a decision is needed
11. Wait for user confirmation before documenting any new shared decision in `/ai-work/00-master-techstack.md`
12. Update `/ai-work/00-master-techstack.md` only when the feature introduces a new shared technology or architecture choice
