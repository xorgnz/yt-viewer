# Project Scope: YouTube Viewer & Tracker (V1)

## Overview

This project is a focused YouTube viewer and tracker that lets a user curate channels, import their videos, and watch them in a distraction-free interface. It exists to replace YouTube's cluttered viewing experience with a streamlined app for both an adult curator and a child-friendly viewing mode.

The product is intended to store channel and video data locally, organize channels into groups, and let users work through videos with profile-specific watched and curation flags. Watching a video inside the app should update progress automatically based on defined completion rules.

## Problem Statement

YouTube's interface is slow, distracting, and poorly suited to curated viewing for a child. The user needs a way to import selected channels, organize their videos, track viewing progress, and offer a safer viewing experience without recommendations or unrelated content.

## Target Users

- Primary: the adult user who curates channels, manages groups, and oversees the library
- Secondary: the child profile user who needs a simplified, curated viewing experience

## Core Objectives

1. Import all videos from a specified YouTube channel and store them locally with user-specific flags.
2. Provide in-app playback that marks videos as watched when completion criteria are met.
3. Support browsing and selection through channel groups, filters, and per-profile video state.

## In Scope

- Channel import using the public YouTube API by channel ID
- Channel grouping and assignment management
- Local storage of video metadata and per-profile flags
- Embedded playback with watched-state automation
- Watch grid filtering by text, date range, and watched status
- Manual ignore and favorite controls
- Watch history view with profile, channel, and date filtering
- Two hard-coded profiles with separate flags and preferences
- Admin pages protected by a hard-coded password

## Explicitly Out of Scope

- User authentication beyond a hard-coded admin password
- Recommendation or algorithmic suggestion features
- Native mobile or desktop applications
- Remote hosting or remote database requirements for V1

## Assumptions and Constraints

- The application is web-only and built with SvelteKit
- Persistence is local-first and may use SQLite
- Video playback uses YouTube's standard embed/iframe approach
- Channel imports are manual, with a manual refresh action rather than background sync
- Timeline is flexible because this is a personal project

## Next Steps

- [ ] Create detailed PRD based on this scope
- [ ] Review and approve scope with stakeholders
- [ ] Generate task breakdown
