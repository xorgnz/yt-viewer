import { VirtualChannel, type VirtualChannelFields } from '$lib/entities/virtualChannel';

export enum ViewerVirtualChannelTimerState
{
    Unlimited = 'unlimited',
    Available = 'available',
    Capped = 'capped'
}

export type ViewerVirtualChannelTimerWindow = {
    startMs: number;
    endMs: number;
};

export type ViewerVirtualChannelTimerFields = {
    virtualChannel: VirtualChannelFields;
    timerState: ViewerVirtualChannelTimerState;
    timerUsageSeconds: number;
    timerRemainingSeconds: number | null;
    dailyTimerRemainingSeconds: number | null;
    extraTimerSecondsRemaining: number;
    combinedTimerRemainingSeconds: number | null;
    timerWindowStartMs: number;
    timerWindowEndMs: number;
};

export class ViewerVirtualChannelTimer
{
    readonly virtualChannel: VirtualChannel;
    readonly timerState: ViewerVirtualChannelTimerState;
    readonly timerUsageSeconds: number;
    readonly timerRemainingSeconds: number | null;
    readonly dailyTimerRemainingSeconds: number | null;
    readonly extraTimerSecondsRemaining: number;
    readonly combinedTimerRemainingSeconds: number | null;
    readonly timerWindowStartMs: number;
    readonly timerWindowEndMs: number;

    constructor(fields: ViewerVirtualChannelTimerFields)
    {
        this.virtualChannel = new VirtualChannel(fields.virtualChannel);
        this.timerState = fields.timerState;
        this.timerUsageSeconds = fields.timerUsageSeconds;
        this.timerRemainingSeconds = fields.timerRemainingSeconds;
        this.dailyTimerRemainingSeconds = fields.dailyTimerRemainingSeconds;
        this.extraTimerSecondsRemaining = fields.extraTimerSecondsRemaining;
        this.combinedTimerRemainingSeconds = fields.combinedTimerRemainingSeconds;
        this.timerWindowStartMs = fields.timerWindowStartMs;
        this.timerWindowEndMs = fields.timerWindowEndMs;
    }

    get id(): string | number
    {
        return this.virtualChannel.id;
    }

    get name(): string
    {
        return this.virtualChannel.name;
    }

    get dailyTimerMax(): number | null
    {
        return this.virtualChannel.dailyTimerMax;
    }

    static createSnapshot(
        virtualChannel: VirtualChannel,
        timerUsageSeconds: number,
        timerWindow: ViewerVirtualChannelTimerWindow
    ): ViewerVirtualChannelTimer
    {
        const normalizedUsageSeconds = ViewerVirtualChannelTimer.normalizeWholeSeconds(timerUsageSeconds);
        const normalizedExtraTimerSecondsRemaining = ViewerVirtualChannelTimer.normalizeWholeSeconds(
            virtualChannel.extraTimerSecondsRemaining
        );

        if (virtualChannel.dailyTimerMax == null) {
            return new ViewerVirtualChannelTimer({
                virtualChannel: virtualChannel.toFields(),
                timerState: ViewerVirtualChannelTimerState.Unlimited,
                timerUsageSeconds: normalizedUsageSeconds,
                timerRemainingSeconds: null,
                dailyTimerRemainingSeconds: null,
                extraTimerSecondsRemaining: normalizedExtraTimerSecondsRemaining,
                combinedTimerRemainingSeconds: null,
                timerWindowStartMs: timerWindow.startMs,
                timerWindowEndMs: timerWindow.endMs
            });
        }

        const normalizedDailyTimerMax = ViewerVirtualChannelTimer.normalizeWholeSeconds(virtualChannel.dailyTimerMax);
        const dailyTimerRemainingSeconds = Math.max(0, normalizedDailyTimerMax - normalizedUsageSeconds);
        const combinedTimerRemainingSeconds = dailyTimerRemainingSeconds + normalizedExtraTimerSecondsRemaining;

        return new ViewerVirtualChannelTimer({
            virtualChannel: new VirtualChannel({
                ...virtualChannel.toFields(),
                dailyTimerMax: normalizedDailyTimerMax
            }).toFields(),
            timerState: combinedTimerRemainingSeconds === 0
                ? ViewerVirtualChannelTimerState.Capped
                : ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: normalizedUsageSeconds,
            timerRemainingSeconds: dailyTimerRemainingSeconds,
            dailyTimerRemainingSeconds,
            extraTimerSecondsRemaining: normalizedExtraTimerSecondsRemaining,
            combinedTimerRemainingSeconds,
            timerWindowStartMs: timerWindow.startMs,
            timerWindowEndMs: timerWindow.endMs
        });
    }

    static normalizeViewModel(value: unknown): ViewerVirtualChannelTimer | null
    {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const candidate = value as Partial<ViewerVirtualChannelTimerFields> & {
            id?: string | number;
            name?: string;
            dailyTimerMax?: number | null;
        };

        const virtualChannel = VirtualChannel.fromUnknown(candidate.virtualChannel ?? candidate);
        if (!virtualChannel) {
            return null;
        }

        const timerUsageSeconds = ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.timerUsageSeconds ?? 0);
        const timerWindow = {
            startMs: ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.timerWindowStartMs ?? 0),
            endMs: ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.timerWindowEndMs ?? 0)
        };
        const fallbackSnapshot = ViewerVirtualChannelTimer.createSnapshot(
            virtualChannel,
            timerUsageSeconds,
            timerWindow
        );

        return new ViewerVirtualChannelTimer({
            virtualChannel: virtualChannel.toFields(),
            timerState: candidate.timerState === ViewerVirtualChannelTimerState.Unlimited
                || candidate.timerState === ViewerVirtualChannelTimerState.Available
                || candidate.timerState === ViewerVirtualChannelTimerState.Capped
                ? candidate.timerState
                : fallbackSnapshot.timerState,
            timerUsageSeconds: fallbackSnapshot.timerUsageSeconds,
            timerRemainingSeconds: typeof candidate.timerRemainingSeconds === 'number'
                ? ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.timerRemainingSeconds)
                : fallbackSnapshot.timerRemainingSeconds,
            dailyTimerRemainingSeconds: typeof candidate.dailyTimerRemainingSeconds === 'number'
                ? ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.dailyTimerRemainingSeconds)
                : fallbackSnapshot.dailyTimerRemainingSeconds,
            extraTimerSecondsRemaining: typeof candidate.extraTimerSecondsRemaining === 'number'
                ? ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.extraTimerSecondsRemaining)
                : fallbackSnapshot.extraTimerSecondsRemaining,
            combinedTimerRemainingSeconds: typeof candidate.combinedTimerRemainingSeconds === 'number'
                ? ViewerVirtualChannelTimer.normalizeWholeSeconds(candidate.combinedTimerRemainingSeconds)
                : fallbackSnapshot.combinedTimerRemainingSeconds,
            timerWindowStartMs: fallbackSnapshot.timerWindowStartMs,
            timerWindowEndMs: fallbackSnapshot.timerWindowEndMs
        });
    }

    toFields(): ViewerVirtualChannelTimerFields
    {
        return {
            virtualChannel: this.virtualChannel.toFields(),
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

    advance(consumedSecondsDelta: number): ViewerVirtualChannelTimer
    {
        const normalizedDeltaSeconds = ViewerVirtualChannelTimer.normalizeWholeSeconds(consumedSecondsDelta);
        if (this.dailyTimerMax == null || normalizedDeltaSeconds === 0) {
            return this;
        }

        const previousDailyTimerRemainingSeconds = Math.max(
            0,
            ViewerVirtualChannelTimer.normalizeWholeSeconds(this.dailyTimerRemainingSeconds ?? 0)
        );
        const previousExtraTimerSecondsRemaining = Math.max(
            0,
            ViewerVirtualChannelTimer.normalizeWholeSeconds(this.extraTimerSecondsRemaining)
        );
        const nextUsageSeconds = Math.max(
            0,
            ViewerVirtualChannelTimer.normalizeWholeSeconds(this.timerUsageSeconds) + normalizedDeltaSeconds
        );
        const nextDailyTimerRemainingSeconds = Math.max(0, previousDailyTimerRemainingSeconds - normalizedDeltaSeconds);
        const extraTimerSecondsConsumed = Math.min(
            previousExtraTimerSecondsRemaining,
            Math.max(0, normalizedDeltaSeconds - previousDailyTimerRemainingSeconds)
        );
        const nextExtraTimerSecondsRemaining = Math.max(
            0,
            previousExtraTimerSecondsRemaining - extraTimerSecondsConsumed
        );
        const nextCombinedTimerRemainingSeconds = nextDailyTimerRemainingSeconds + nextExtraTimerSecondsRemaining;

        return new ViewerVirtualChannelTimer({
            virtualChannel: this.virtualChannel.toFields(),
            timerState: nextCombinedTimerRemainingSeconds === 0
                ? ViewerVirtualChannelTimerState.Capped
                : ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: nextUsageSeconds,
            timerRemainingSeconds: nextDailyTimerRemainingSeconds,
            dailyTimerRemainingSeconds: nextDailyTimerRemainingSeconds,
            extraTimerSecondsRemaining: nextExtraTimerSecondsRemaining,
            combinedTimerRemainingSeconds: nextCombinedTimerRemainingSeconds,
            timerWindowStartMs: this.timerWindowStartMs,
            timerWindowEndMs: this.timerWindowEndMs
        });
    }

    getExtraTimerSecondsConsumedForAdvance(consumedSecondsDelta: number): number
    {
        return Math.max(0, this.extraTimerSecondsRemaining - this.advance(consumedSecondsDelta).extraTimerSecondsRemaining);
    }

    isPlaybackCapped(): boolean
    {
        return this.timerState === ViewerVirtualChannelTimerState.Capped;
    }

    shouldBlockActiveSessionReload(remainingSecondsThreshold = 1): boolean
    {
        if (this.dailyTimerMax == null || this.isPlaybackCapped()) {
            return false;
        }

        return Math.max(
            0,
            ViewerVirtualChannelTimer.normalizeWholeSeconds(this.combinedTimerRemainingSeconds ?? 0)
        ) <= ViewerVirtualChannelTimer.normalizeWholeSeconds(remainingSecondsThreshold);
    }

    private static normalizeWholeSeconds(value: number): number
    {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.max(0, Math.floor(value));
    }
}
