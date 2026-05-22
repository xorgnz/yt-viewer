export enum ViewerVirtualChannelTimerState
{
    Unlimited = 'unlimited',
    Available = 'available',
    Capped = 'capped'
}

export type ViewerVirtualChannelFields = {
    id: string | number;
    name: string;
    dailyTimerMax: number | null;
    timerState: ViewerVirtualChannelTimerState;
    timerUsageSeconds: number;
    timerRemainingSeconds: number | null;
    dailyTimerRemainingSeconds: number | null;
    extraTimerSecondsRemaining: number;
    combinedTimerRemainingSeconds: number | null;
    timerWindowStartMs: number;
    timerWindowEndMs: number;
};

export class ViewerVirtualChannel
{
    readonly id: string | number;
    readonly name: string;
    readonly dailyTimerMax: number | null;
    readonly timerState: ViewerVirtualChannelTimerState;
    readonly timerUsageSeconds: number;
    readonly timerRemainingSeconds: number | null;
    readonly dailyTimerRemainingSeconds: number | null;
    readonly extraTimerSecondsRemaining: number;
    readonly combinedTimerRemainingSeconds: number | null;
    readonly timerWindowStartMs: number;
    readonly timerWindowEndMs: number;

    constructor(fields: ViewerVirtualChannelFields)
    {
        this.id = fields.id;
        this.name = fields.name;
        this.dailyTimerMax = fields.dailyTimerMax;
        this.timerState = fields.timerState;
        this.timerUsageSeconds = fields.timerUsageSeconds;
        this.timerRemainingSeconds = fields.timerRemainingSeconds;
        this.dailyTimerRemainingSeconds = fields.dailyTimerRemainingSeconds;
        this.extraTimerSecondsRemaining = fields.extraTimerSecondsRemaining;
        this.combinedTimerRemainingSeconds = fields.combinedTimerRemainingSeconds;
        this.timerWindowStartMs = fields.timerWindowStartMs;
        this.timerWindowEndMs = fields.timerWindowEndMs;
    }

    toFields(): ViewerVirtualChannelFields
    {
        return {
            id: this.id,
            name: this.name,
            dailyTimerMax: this.dailyTimerMax,
            timerState: this.timerState,
            timerUsageSeconds: this.timerUsageSeconds,
            timerRemainingSeconds: this.timerRemainingSeconds,
            dailyTimerRemainingSeconds: this.dailyTimerRemainingSeconds,
            extraTimerSecondsRemaining: this.extraTimerSecondsRemaining,
            combinedTimerRemainingSeconds: this.combinedTimerRemainingSeconds,
            timerWindowStartMs: this.timerWindowStartMs,
            timerWindowEndMs: this.timerWindowEndMs
        };
    }
}
