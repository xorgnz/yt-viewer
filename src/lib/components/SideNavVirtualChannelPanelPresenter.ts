import type { SideNavVirtualChannelViewModel } from '$lib/components/SideNavVirtualChannelPanelViewModel';
import { ViewerVirtualChannelTimerState } from '$lib/viewer/ViewerVirtualChannelTimer';

export class SideNavVirtualChannelPanelPresenter
{
    private readonly virtualChannel: SideNavVirtualChannelViewModel;
    private readonly splitTimerModeEnabled: boolean;

    constructor(virtualChannel: SideNavVirtualChannelViewModel, splitTimerModeEnabled = true)
    {
        this.virtualChannel = virtualChannel;
        this.splitTimerModeEnabled = splitTimerModeEnabled;
    }

    getTimerModeLabel(): string
    {
        if (
            this.virtualChannel.timerState === ViewerVirtualChannelTimerState.Unlimited
            || this.virtualChannel.dailyTimerMax == null
        ) {
            return 'Unlimited';
        }

        return '';
    }

    getConsumedDurationLabel(): string
    {
        return this.formatDuration(this.virtualChannel.timerUsageSeconds ?? 0);
    }

    getTotalDurationLabel(): string | null
    {
        if (
            this.virtualChannel.dailyTimerMax == null
            || this.virtualChannel.timerState === ViewerVirtualChannelTimerState.Unlimited
        ) {
            return null;
        }

        const totalAvailableSeconds = Math.max(
            0,
            (this.virtualChannel.timerUsageSeconds ?? 0) + (this.virtualChannel.combinedTimerRemainingSeconds ?? 0)
        );

        return this.formatDuration(totalAvailableSeconds);
    }

    getDailyAllowanceLabel(): string | null
    {
        if (!this.splitTimerModeEnabled) {
            return null;
        }

        if (
            this.virtualChannel.dailyTimerMax == null
            || this.virtualChannel.timerState === ViewerVirtualChannelTimerState.Unlimited
        ) {
            return null;
        }

        return this.formatDuration(this.virtualChannel.dailyTimerMax);
    }

    getExtraRemainingLabel(): string | null
    {
        if (!this.splitTimerModeEnabled) {
            return null;
        }

        if (
            this.virtualChannel.dailyTimerMax == null
            || this.virtualChannel.timerState === ViewerVirtualChannelTimerState.Unlimited
            || (this.virtualChannel.extraTimerSecondsRemaining ?? 0) <= 0
        ) {
            return null;
        }

        return this.formatDuration(this.virtualChannel.extraTimerSecondsRemaining ?? 0);
    }

    private formatDuration(seconds: number): string
    {
        const normalizedSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(normalizedSeconds / 60);
        const remainderSeconds = normalizedSeconds % 60;

        return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
    }
}
