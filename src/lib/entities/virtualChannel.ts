import type { ViewerVirtualChannelTimerState } from '$lib/viewer/ViewerVirtualChannelTimer';

export type VirtualChannelFields = {
    id: string | number;
    name: string;
    dailyTimerMax: number | null;
    extraTimerSecondsRemaining: number;
    timerState?: ViewerVirtualChannelTimerState;
    timerUsageSeconds?: number;
    timerRemainingSeconds?: number | null;
    dailyTimerRemainingSeconds?: number | null;
    combinedTimerRemainingSeconds?: number | null;
    timerWindowStartMs?: number;
    timerWindowEndMs?: number;
};

export class VirtualChannel
{
    readonly id: string | number;
    readonly name: string;
    readonly dailyTimerMax: number | null;
    readonly extraTimerSecondsRemaining: number;
    readonly timerState?: ViewerVirtualChannelTimerState;
    readonly timerUsageSeconds?: number;
    readonly timerRemainingSeconds?: number | null;
    readonly dailyTimerRemainingSeconds?: number | null;
    readonly combinedTimerRemainingSeconds?: number | null;
    readonly timerWindowStartMs?: number;
    readonly timerWindowEndMs?: number;

    constructor(data: VirtualChannelFields) {
        this.id = data.id;
        this.name = data.name;
        this.dailyTimerMax = data.dailyTimerMax;
        this.extraTimerSecondsRemaining = data.extraTimerSecondsRemaining;
        this.timerState = data.timerState;
        this.timerUsageSeconds = data.timerUsageSeconds;
        this.timerRemainingSeconds = data.timerRemainingSeconds;
        this.dailyTimerRemainingSeconds = data.dailyTimerRemainingSeconds;
        this.combinedTimerRemainingSeconds = data.combinedTimerRemainingSeconds;
        this.timerWindowStartMs = data.timerWindowStartMs;
        this.timerWindowEndMs = data.timerWindowEndMs;
    }

    toFields(): VirtualChannelFields
    {
        return {
            id: this.id,
            name: this.name,
            dailyTimerMax: this.dailyTimerMax,
            extraTimerSecondsRemaining: this.extraTimerSecondsRemaining,
            timerState: this.timerState,
            timerUsageSeconds: this.timerUsageSeconds,
            timerRemainingSeconds: this.timerRemainingSeconds,
            dailyTimerRemainingSeconds: this.dailyTimerRemainingSeconds,
            combinedTimerRemainingSeconds: this.combinedTimerRemainingSeconds,
            timerWindowStartMs: this.timerWindowStartMs,
            timerWindowEndMs: this.timerWindowEndMs
        };
    }

    static validate(value: any): value is VirtualChannel {
        if (value instanceof VirtualChannel) return true;
        return (
            value &&
            typeof value === 'object' &&
            (typeof value.id === 'string' || typeof value.id === 'number') &&
            typeof value.name === 'string' &&
            (
                value.dailyTimerMax === null
                || typeof value.dailyTimerMax === 'number'
            ) &&
            typeof value.extraTimerSecondsRemaining === 'number'
        );
    }

    with(patch: Update<VirtualChannel>): VirtualChannel {
        return new VirtualChannel({
                id: patch.id ?? this.id,
                name: patch.name ?? this.name,
                dailyTimerMax: patch.dailyTimerMax ?? this.dailyTimerMax,
                extraTimerSecondsRemaining: patch.extraTimerSecondsRemaining ?? this.extraTimerSecondsRemaining,
                timerState: patch.timerState ?? this.timerState,
                timerUsageSeconds: patch.timerUsageSeconds ?? this.timerUsageSeconds,
                timerRemainingSeconds: patch.timerRemainingSeconds ?? this.timerRemainingSeconds,
                dailyTimerRemainingSeconds: patch.dailyTimerRemainingSeconds ?? this.dailyTimerRemainingSeconds,
                combinedTimerRemainingSeconds: patch.combinedTimerRemainingSeconds ?? this.combinedTimerRemainingSeconds,
                timerWindowStartMs: patch.timerWindowStartMs ?? this.timerWindowStartMs,
                timerWindowEndMs: patch.timerWindowEndMs ?? this.timerWindowEndMs,
            }
        );
    }
}
// apply-patch-anchor - do not delete
