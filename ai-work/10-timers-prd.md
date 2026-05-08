# Product Requirements Document: 10-timers

## Overview

This feature adds optional daily playback allowances to virtual channels. A virtual channel may define a daily time cap, while channels without a configured allowance remain unlimited and continue to behave as they do today.

The system will enforce the allowance using the existing viewing log as the single source of truth for consumed watch time. When a capped channel reaches its daily allowance, playback stops, the player communicates the capped state, the channel becomes unavailable in the channel list, and its videos remain visible but disabled in the video list until the allowance resets.

## Goals

1. Allow users to configure an optional daily playback allowance per virtual channel.
2. Enforce allowances using deterministic watch-time accounting based on the existing viewing log.
3. Make capped-channel state visible and predictable across playback and browsing UI.
4. Preserve current behavior for channels with no configured allowance.

## Scope Boundaries

### In Scope

- Optional per-virtual-channel daily playback allowance
- Daily reset based on user-configurable timezone midnight
- Timer configuration in a dedicated section of the existing virtual channel edit form
- Allowance input in whole minutes for v1
- Allowance enforcement based on aggregate watched time from the existing playback/viewing log
- Automatic playback stop when the daily allowance is exhausted
- Player status messaging when playback is blocked by the timer cap
- Disabled and greyed-out capped channels in the channel list
- Visible but disabled and greyed-out videos for capped channels in the video list
- Deterministic allowance calculation from one source of truth

### Out of Scope

- Per-source-channel timers within a virtual channel
- Rolling windows or other reset-period variants
- API or import/export support for timer settings or timer state
- Perfect frame-accurate playback accounting beyond what the existing viewing log supports
- Separate timer management screens outside the virtual channel edit flow

### Assumptions and Constraints

- Channels with no configured allowance remain unlimited.
- The first version uses the existing viewing log as the source of truth rather than introducing a second timer-specific accounting system.
- The user-configurable timezone used for daily reset must come from an existing app setting if one exists; otherwise implementation may need a single shared timezone setting.
- Minute-based input is acceptable for v1 even if finer-grained editing is not supported.

## User Stories

- As a user, I can set an optional daily playback cap for a virtual channel.
- As a user, I can leave a virtual channel uncapped so it behaves normally.
- As a user, I can see when a channel is capped for the current day.
- As a user, I am prevented from selecting a capped channel or its videos until the reset occurs.
- As a user, I get a clear playback-state indication when playback stops because the timer allowance was exhausted.

## Functional Requirements

### Timer Configuration

1. The virtual channel edit experience must include a dedicated timer section.
2. The timer section must allow the user to leave the channel uncapped.
3. The timer section must allow the user to enter a daily allowance in whole minutes.
4. Validation must reject invalid minute values such as negative numbers or empty values when timer mode is enabled.
5. Persisted timer settings must remain associated with the virtual channel.

### Allowance Accounting

6. Consumed timer usage must be derived from the existing viewing log.
7. The system must treat the viewing log as the single source of truth for consumed daily watch time.
8. Timer usage must be calculated within the active daily window defined by the configured timezone.
9. Unlimited channels must never be blocked by timer enforcement.
10. Timer calculations should be deterministic for the same viewing-log inputs.

### Playback Enforcement

11. If playback on a capped channel reaches or exceeds the daily allowance, the player must stop playback.
12. The player must present a status message indicating the timer limit has been reached for that channel.
13. A capped channel must not allow further playback selection until the next reset window.
14. Enforcement must continue to apply after page reload or app restart because it is based on persisted viewing-log data.

### Channel And Video Availability

15. In the channel list, capped channels must remain visible, appear greyed out, and be non-selectable.
16. In the video list for a capped channel, videos must remain visible, appear greyed out, and be non-clickable.
17. The UI must update capped state consistently wherever channel/video selection is offered for this workflow.

## Non-Goals

- Fine-grained analytics about where timer usage was spent
- Historical reporting or audit views for timer consumption
- Multiple timer types or layered timer policies
- Exact reconstruction of player-active milliseconds beyond the fidelity of the existing viewing log

## Technical Considerations

- The implementation should reuse the existing watch-history/playback logging model rather than create a parallel timer ledger.
- The daily-window calculation depends on a shared timezone definition and should avoid ambiguous reset behavior.
- UI enforcement and backend enforcement should agree on capped status so the same channel is not available in one surface and blocked in another.
- The feature may require adding virtual-channel settings storage and derived capped-state evaluation paths wherever virtual channel availability is loaded.

## Risks And Considerations

- If the current viewing log does not store enough information to calculate daily usage cleanly by timezone window, supporting logic or migration work may be required.
- Timezone handling can create off-by-one-day behavior if the app lacks a clear shared timezone source.
- Aggregate watch-log accounting may differ slightly from true active playback time, but this is an accepted v1 tradeoff for determinism and simpler architecture.

## Success Criteria

1. Users can configure or remove a daily minute allowance for a virtual channel.
2. Unlimited channels behave exactly as before.
3. Capped channels stop playback and become unavailable after the allowance is exhausted.
4. The same viewing-log data always yields the same capped/unlimited result.
5. The UI clearly communicates capped state in the player, channel list, and video list.
