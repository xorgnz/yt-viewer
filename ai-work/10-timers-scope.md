# Project Scope: Timers

## Overview

This feature adds optional playback time allowances to virtual channels. A virtual channel may be configured with a daily playback cap, while channels without a configured cap remain unlimited and behave as they do today.

When a capped virtual channel reaches its daily allowance, the application should stop playback, communicate that the timer limit was reached, and prevent further selection of that channel's videos until the allowance resets.

## Problem Statement

Users need a way to limit how long a virtual channel can be watched within a day, while keeping other channels unrestricted. The system currently has no built-in concept of per-channel playback allowances or automatic enforcement when a limit is reached.

## Target Users

Users who manage and watch virtual channels and want optional daily viewing limits on specific channels.

## Core Objectives

1. Allow a virtual channel to have an optional daily playback allowance.
2. Track actual playback time against that allowance and enforce the limit automatically.
3. Reflect capped-channel state clearly in the player, channel list, and video list.

## In Scope

- Optional per-virtual-channel daily playback allowances
- Tracking actual watched playback time for allowance usage
- Stopping playback when a channel reaches its daily allowance
- Showing capped status in the player UI
- Disabling selection of capped virtual channels in the channel list
- Showing capped-channel videos as unavailable in the video list while leaving the list visible
- Automatic reset of channel allowance usage on a daily basis

## Explicitly Out of Scope

- Per-source-channel timers within a virtual channel
- Rolling time windows or configurable reset-period variants
- API or import/export support for timer settings or timer state

## Assumptions and Constraints

- Channels without a configured timer allowance remain unlimited by default.
- The first version manages timer settings only at the virtual-channel level.
- A capped channel remains visible in the UI rather than being hidden.
- Enforcement depends on actual playback time rather than full video duration or completion state.
