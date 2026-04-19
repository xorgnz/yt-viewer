# Cloud setup before continuing deployment validation

- [x] Choose the GCP project ID to deploy into: `trond-personal-tools`.
- [x] Use Cloud Run service name `yt-viewer`; the deploy script will create it if needed.
- [x] Use deployment region `us-west1`.
- [x] Confirm InMotion MySQL/MariaDB remote access is available.
  Database name: `memeha5_ytviewer`.
  Database username: `memeha5_ytviewer_user`.
  Database host: `www.meme-hazard.org`.
  Database port: `3306`.
  Password: provided out of band for local testing only; do not commit it.
- [ ] Create a Secret Manager secret containing the production MySQL/MariaDB `DATABASE_URL`.
   Default secret name expected by scripts: `yt-viewer-database-url`.
   Default version expected by scripts: `latest`.
- [ ] Grant the Cloud Run runtime service account permission to access that secret.
- [ ] Ensure the local `gcloud` CLI is authenticated and configured for the chosen project.
- [ ] Confirm which command should be used for deployment:
   PowerShell: `.\deploy.ps1 -ProjectId <project-id>`
   Bash: `PROJECT_ID=<project-id> ./deploy.sh`

If you use a different service name, region, or secret name, pass the matching overrides to the deploy script.
