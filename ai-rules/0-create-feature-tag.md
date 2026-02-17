# Rule: Creating a Feature Tag

## Goal

To guide an AI assistant in creating a unique, descriptive feature tag that will be used to organize all documentation and artifacts related to a specific feature throughout its entire lifecycle.

## Operating Environment

**CRITICAL:** This workflow operates in a WSL (Windows Subsystem for Linux) Ubuntu environment:
- Use Unix/Linux commands only (e.g., `ls`, `mkdir`, `cd`)
- Use forward slashes `/` for paths (e.g., `/ai-work/`)
- NEVER use PowerShell commands (e.g., `Get-ChildItem`, `New-Item`)
- NEVER use Windows CMD commands (e.g., `dir`, `md`)
- File paths follow Linux conventions

## When to Use

This rule should be executed **first**, before creating any other documentation (scope, PRD, tasks, etc.) for a new feature. The feature tag becomes the organizing principle for all subsequent work.

## Feature Tag Format

A feature tag consists of two parts:
- **Sequence Number:** 2 digits (e.g., `01`, `02`, `15`)
- **Identifier:** Up to 16 characters (lowercase, hyphens for spaces)

**Format:** `{NN}-{identifier}`

**Examples:**
- `01-user-auth-system`
- `02-payment-gateway`
- `03-dashboard-widget`
- `15-export-reports`

## Process

1. **Check Existing Features:** Look in the `/ai-work` directory for existing feature-tagged files to determine the next sequence number
2. **Determine Sequence Number:** Use the next available number based on existing features (if no features exist, start with `01`)
3. **Create Identifier:** Based on the user's initial feature request, create a short, descriptive identifier:
   - Maximum 16 characters
   - Lowercase letters and hyphens only
   - Should be memorable and descriptive
   - Examples: `user-login`, `api-integration`, `data-export`
4. **Validate Uniqueness:** Ensure no existing feature uses this exact tag
5. **Present to User:** Show the proposed feature tag and get confirmation
6. **Document:** Once approved, this tag will prefix all files for this feature

## Identifier Guidelines

### Good Identifiers
- `user-auth-system` (14 chars, clear purpose)
- `payment-gateway` (15 chars, specific feature)
- `admin-dashboard` (15 chars, clear scope)
- `file-upload` (11 chars, simple and clear)

### Poor Identifiers
- `new-feature` (too vague)
- `update-system` (not descriptive)
- `fix-bugs` (too broad)
- `very-long-identifier-name` (exceeds 16 characters)

## Usage Throughout Workflow

Once created, the feature tag is used to name all related files:

- `{feature-tag}-scope.md` - High-level scope document
- `{feature-tag}-prd.md` - Product requirements document
- `{feature-tag}-techstack.md` - Technology stack decisions
- `{feature-tag}-tasks.md` - Task breakdown and tracking

## Example Interaction

```
User: "I want to add user authentication to the app"

AI: "I'll create a feature tag for this. Looking at your /ai-work directory, I see the last feature was '02-dashboard-widget'.

I propose the feature tag: 03-user-auth

This will be used for all files:
- 03-user-auth-scope.md
- 03-user-auth-prd.md
- 03-user-auth-techstack.md
- 03-user-auth-tasks.md

Does this work for you, or would you prefer a different identifier?"

User: "That works"

AI: "Great! Feature tag '03-user-auth' is confirmed. Let's proceed to create the scope document."
```

## Handling Edge Cases

### No Existing Features
- Start with `01-{identifier}`

### User Wants Specific Number
- Allow user to specify sequence number (e.g., `10-future-feature`)
- Ensure it doesn't conflict with existing tags

### Identifier Too Long
- Ask user for a shorter version
- Suggest abbreviations if appropriate

### Multiple Features in Parallel
- Each gets its own sequence number
- Tags help keep work streams separate and organized

## Output

- **Format:** Plain text (the tag itself)
- **Example:** `03-user-auth`
- **Location:** This tag is not saved separately; it's immediately used to create the scope document

## Final Instructions

1. Always create the feature tag BEFORE starting scope/PRD/tasks
2. Feature tag must be unique within the project
3. Once confirmed, use this tag consistently for ALL related files
4. The tag should be memorable enough that the user can reference it easily (e.g., "Let's work on feature 03")
5. After confirming the tag, proceed immediately to creating the scope document using rule `1-create-scope.md`
