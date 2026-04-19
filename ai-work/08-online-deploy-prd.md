# Product Requirements Document (PRD): 08-online-deploy

## Overview
Deploy the yt-viewer SvelteKit application to Google Cloud (GCP) using Cloud Run. Ship a Node-based SvelteKit server build (adapter-node) and connect to an external MySQL/MariaDB database vendor. Manage secrets with Google Cloud Secret Manager. Keep environments minimal: local dev and prod only.

## Goals
- Provide a reliable, low-friction deployment path to GCP Cloud Run.
- Build and run a Node SvelteKit server artifact suitable for Cloud Run (`node build`).
- Configure secrets and environment variables securely via GCP Secret Manager.
- Enable database connectivity to an external MySQL/MariaDB vendor.
- Document a repeatable deploy procedure (PowerShell and Bash scripts) and essential configuration.

## Requirements
### Build
- Use `@sveltejs/adapter-node` to produce a Node server output in `build/` that is executable with `node build`.
- Ensure the repo defines a proper `build` script (SvelteKit build). Production start is handled by `scripts.start = "node build"` in the staged deploy manifest or in repo scripts.

### Deployment Target (Cloud Run)
- Deploy to Cloud Run in the specified GCP project and region.
- Use `gcloud run deploy` with a staged `deploy/` folder (buildpacks flow).
- Service must bind to `HOST=0.0.0.0` and the Cloud Run-provided `PORT`.

### Secrets and Configuration
- Store sensitive values in GCP Secret Manager; do not commit secrets.
- Wire database credentials for MySQL/MariaDB via Secret Manager:
  - Preferred single-secret option: `DATABASE_URL` (e.g., `mysql://user:pass@host:3306/db`).
- Non-sensitive toggles may be set as regular env vars (e.g., `HOST`).

### Environments
- Dev: local environment using existing workflow.
- Prod: Cloud Run deployment using cross-platform scripts.

### Scripts and Tooling
- Maintain and use `deploy.ps1` (PowerShell/Windows) and `deploy.sh` (Bash/Unix-like).
- Scripts should:
  - Clean and stage `deploy/` with `build/`, `package.json`, `package-lock.json`, and optional `.githash`.
  - Patch `deploy/package.json` to include `scripts.start = "node build"` when needed for buildpacks.
  - Run a brief smoke test by executing `node build` with `PORT=8080` and `HOST=0.0.0.0` to catch obvious failures pre-deploy.
  - Call `gcloud run deploy` with appropriate flags, including `--update-secrets` for DB credentials and `--set-env-vars HOST=0.0.0.0`.

### Basic Operability
- A simple smoke test (process starts and doesn’t crash immediately) is sufficient in this feature.
- No advanced observability or rollback automation is required in this feature.

## Constraints and Considerations
- Hosting: Cloud Run favored for simplicity and cost.
- Data layer: Current code uses SQLite via `better-sqlite3`. Cloud Run file system is ephemeral; SQLite is not production-suitable on Cloud Run. MySQL/MariaDB integration is required for production runtime.
- Security: Secrets must be sourced from Secret Manager; never hardcode or commit them.
- Performance/Cost: Defaults acceptable; optional flags like `--min-instances=0` can reduce cost.

## Technical Considerations
- Adapter: Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node` to ensure server output compatible with `node build`.
- Buildpacks: With a staged `deploy/` folder and `scripts.start` present, Cloud Run buildpacks can build and run without a Dockerfile.
- Secret wiring: Use `--update-secrets` in `gcloud run deploy` to bind secrets to env vars required by the app.
- Database migration: Implementing a MySQL/MariaDB client and DAO changes is significant; plan as separate tasks if not folded into this feature.

## Success Metrics
- Cloud Run deploy completes successfully and yields a reachable service endpoint without runtime startup errors.
- Secrets are injected from Secret Manager (visible in service configuration) even if DB usage is deferred.
- Deploy scripts run end-to-end on both Windows (PowerShell) and Unix-like environments.

## User Stories (optional)
- As the project owner, I can run a one-command deployment that builds, smoke-tests, and publishes the service to Cloud Run.
- As a maintainer, I can manage production credentials safely through Secret Manager without changing code.

## Non-goals
- Full observability (centralized logs, metrics, alerting) and automated rollback.
- Multi-environment matrix beyond local dev and prod.
- Multi-region or compliance-driven requirements.

## Clarifications Applied
- Hosting product: Cloud Run (confirmed).
- Secrets management: Google Cloud Secret Manager (confirmed).
- Environments: dev (local) and prod (Cloud Run) only (confirmed).

## Open Questions
1. MySQL/MariaDB integration timing: implement in this feature or defer as a follow-up feature after initial deploy validation?
2. Secret format preference: single `DATABASE_URL` vs. discrete database variables?
3. Cloud Run service scaling flags: keep defaults or set `--min-instances=0` and a specific `--max-instances`?
4. Final identifiers: confirm `SERVICE_NAME`, `PROJECT_ID`, and `REGION` to bake into scripts.
