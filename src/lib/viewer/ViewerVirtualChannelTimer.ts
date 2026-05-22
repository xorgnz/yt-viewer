import { VirtualChannel } from '$lib/entities/virtualChannel';
import {
    ViewerVirtualChannel,
    type ViewerVirtualChannelFields,
    ViewerVirtualChannelTimerState
} from '$lib/viewer/ViewerVirtualChannel';

type ViewerVirtualChannelTimerWindow = {
    startMs: number;
    endMs: number;
};

type ViewerVirtualChannelTimerAdvanceResult = {
    virtualChannel: ViewerVirtualChannel;
    extraTimerSecondsConsumed: number;
};

export class ViewerVirtualChannelTimer
{
    createSnapshot(
        virtualChannel: VirtualChannel,
        timerUsageSeconds: number,
        timerWindow: ViewerVirtualChannelTimerWindow
    ): ViewerVirtualChannel
    {
        const normalizedUsageSeconds = this.normalizeWholeSeconds(timerUsageSeconds);
        const normalizedExtraTimerSecondsRemaining = this.normalizeWholeSeconds(
            virtualChannel.extraTimerSecondsRemaining
        );

        if (virtualChannel.dailyTimerMax == null) {
            return new ViewerVirtualChannel({
                id: virtualChannel.id,
                name: virtualChannel.name,
                dailyTimerMax: null,
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

        const normalizedDailyTimerMax = this.normalizeWholeSeconds(virtualChannel.dailyTimerMax);
        const dailyTimerRemainingSeconds = Math.max(0, normalizedDailyTimerMax - normalizedUsageSeconds);
        const combinedTimerRemainingSeconds = dailyTimerRemainingSeconds + normalizedExtraTimerSecondsRemaining;

        return new ViewerVirtualChannel({
            id: virtualChannel.id,
            name: virtualChannel.name,
            dailyTimerMax: normalizedDailyTimerMax,
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

    advanceSnapshot(
        virtualChannel: ViewerVirtualChannel,
        consumedSecondsDelta: number
    ): ViewerVirtualChannelTimerAdvanceResult
    {
        const normalizedDeltaSeconds = this.normalizeWholeSeconds(consumedSecondsDelta);
        if (virtualChannel.dailyTimerMax == null || normalizedDeltaSeconds === 0) {
            return {
                virtualChannel,
                extraTimerSecondsConsumed: 0
            };
        }

        const previousDailyTimerRemainingSeconds = Math.max(
            0,
            this.normalizeWholeSeconds(virtualChannel.dailyTimerRemainingSeconds ?? 0)
        );
        const previousExtraTimerSecondsRemaining = Math.max(
            0,
            this.normalizeWholeSeconds(virtualChannel.extraTimerSecondsRemaining)
        );
        const nextUsageSeconds = Math.max(
            0,
            this.normalizeWholeSeconds(virtualChannel.timerUsageSeconds) + normalizedDeltaSeconds
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

        return {
            virtualChannel: new ViewerVirtualChannel({
                ...virtualChannel,
                timerState: nextCombinedTimerRemainingSeconds === 0
                    ? ViewerVirtualChannelTimerState.Capped
                    : ViewerVirtualChannelTimerState.Available,
                timerUsageSeconds: nextUsageSeconds,
                timerRemainingSeconds: nextDailyTimerRemainingSeconds,
                dailyTimerRemainingSeconds: nextDailyTimerRemainingSeconds,
                extraTimerSecondsRemaining: nextExtraTimerSecondsRemaining,
                combinedTimerRemainingSeconds: nextCombinedTimerRemainingSeconds
            }),
            extraTimerSecondsConsumed
        };
    }

    isPlaybackCapped(virtualChannel: ViewerVirtualChannel | null): boolean
    {
        return virtualChannel?.timerState === ViewerVirtualChannelTimerState.Capped;
    }

    shouldBlockActiveSessionReload(
        virtualChannel: ViewerVirtualChannel,
        remainingSecondsThreshold = 1
    ): boolean
    {
        if (virtualChannel.dailyTimerMax == null || this.isPlaybackCapped(virtualChannel)) {
            return false;
        }

        return Math.max(
            0,
            this.normalizeWholeSeconds(virtualChannel.combinedTimerRemainingSeconds ?? 0)
        ) <= this.normalizeWholeSeconds(remainingSecondsThreshold);
    }

    normalizeViewModel(value: unknown): ViewerVirtualChannel | null
    {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const candidate = value as Partial<ViewerVirtualChannelFields>;
        if (
            (typeof candidate.id !== 'string' && typeof candidate.id !== 'number')
            || typeof candidate.name !== 'string'
        ) {
            return null;
        }

        const dailyTimerMax = typeof candidate.dailyTimerMax === 'number'
            ? this.normalizeWholeSeconds(candidate.dailyTimerMax)
            : null;
        const timerUsageSeconds = this.normalizeWholeSeconds(candidate.timerUsageSeconds ?? 0);
        const extraTimerSecondsRemaining = this.normalizeWholeSeconds(candidate.extraTimerSecondsRemaining ?? 0);
        const timerWindow = {
            startMs: this.normalizeWholeSeconds(candidate.timerWindowStartMs ?? 0),
            endMs: this.normalizeWholeSeconds(candidate.timerWindowEndMs ?? 0)
        };

        if (dailyTimerMax == null) {
            return this.createSnapshot(new VirtualChannel({
                id: candidate.id,
                name: candidate.name,
                dailyTimerMax: null,
                extraTimerSecondsRemaining
            }), timerUsageSeconds, timerWindow);
        }

        const fallbackSnapshot = this.createSnapshot(new VirtualChannel({
            id: candidate.id,
            name: candidate.name,
            dailyTimerMax,
            extraTimerSecondsRemaining
        }), timerUsageSeconds, timerWindow);

        return new ViewerVirtualChannel({
            ...fallbackSnapshot,
            timerState: candidate.timerState === ViewerVirtualChannelTimerState.Unlimited
                || candidate.timerState === ViewerVirtualChannelTimerState.Available
                || candidate.timerState === ViewerVirtualChannelTimerState.Capped
                ? candidate.timerState
                : fallbackSnapshot.timerState,
            timerRemainingSeconds: typeof candidate.timerRemainingSeconds === 'number'
                ? this.normalizeWholeSeconds(candidate.timerRemainingSeconds)
                : fallbackSnapshot.timerRemainingSeconds,
            dailyTimerRemainingSeconds: typeof candidate.dailyTimerRemainingSeconds === 'number'
                ? this.normalizeWholeSeconds(candidate.dailyTimerRemainingSeconds)
                : fallbackSnapshot.dailyTimerRemainingSeconds,
            combinedTimerRemainingSeconds: typeof candidate.combinedTimerRemainingSeconds === 'number'
                ? this.normalizeWholeSeconds(candidate.combinedTimerRemainingSeconds)
                : fallbackSnapshot.combinedTimerRemainingSeconds
        });
    }

    private normalizeWholeSeconds(value: number): number
    {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.max(0, Math.floor(value));
    }
}

export const viewerVirtualChannelTimer = new ViewerVirtualChannelTimer();
// apply-patch-anchor - do not delete
