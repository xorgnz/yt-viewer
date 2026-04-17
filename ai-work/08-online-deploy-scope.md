# Project Scope: 08-online-deploy

## Overview

Deploy the yt-viewer SvelteKit application to Google Cloud with a streamlined two-environment setup (local dev and GCP prod). Use `adapter-node` to produce a Node runtime artifact suitable for GCP hosting and connect the app to an external managed Postgres database. Manage runtime configuration and credentials via Google Cloud Secret Manager.

## Problem Statement

The project currently runs locally only. We need a reliable, low-friction path to deploy and run the app online on GCP while safely handling secrets and connecting to the existing Postgres vendor.

## Target Users

- Project owner and occasional collaborators using a public or private endpoint hosted on GCP

## Core Objectives

1. Build the app with SvelteKit `adapter-node` for a Node runtime on GCP.
2. Configure secure secret management using GCP Secret Manager and env var injection.
3. Connect the deployed app to the existing Postgres database vendor.
4. Define a simple, repeatable deployment procedure for prod (GCP) alongside local dev.

## In Scope

- Selecting an appropriate GCP runtime/hosting option for a Node server (e.g., Cloud Run, GCE, or App Engine; default to Cloud Run unless otherwise specified)
- Build pipeline steps to produce deployable artifacts and container image if needed
- Secret retrieval/injection for runtime configuration
- Minimal environment configuration: dev (local) and prod (GCP)
- Basic runtime health verification (service starts and connects to DB)

## Explicitly Out of Scope

- Advanced observability (centralized logs, metrics, alerting)
- Complex environment matrix (staging/preview)
- Multi-region, DR, or strict compliance requirements

## Assumptions and Constraints

- Google Cloud project and billing are already set up or will be provided
- Postgres connection info (host, port, db, user) will be available via Secret Manager
- No special regional or latency constraints at this time
