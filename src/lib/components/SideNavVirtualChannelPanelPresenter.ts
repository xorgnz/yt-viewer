import type { SideNavVirtualChannelViewModel } from '$lib/components/SideNavVirtualChannelPanelViewModel';
import { ViewerVirtualChannelTimerState } from '$lib/viewer/types';

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
        return this.formatDuration(this.virtualChannel.timerUsageSeconds);
    }

    getTotalDurationLabel(): string | null
    {
        if (
            this.virtualChannel.dailyTimerMax == null
            || this.virtualChannel.timerState === ViewerVirtualChannelTimerState.Unlimited
        ) {
            return null;
        }

        return this.formatDuration(this.virtualChannel.dailyTimerMax);
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
            || this.virtualChannel.extraTimerSecondsRemaining <= 0
        ) {
            return null;
        }

        return this.formatDuration(this.virtualChannel.extraTimerSecondsRemaining);
    }

    private formatDuration(seconds: number): string
    {
        const normalizedSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(normalizedSeconds / 60);
        const remainderSeconds = normalizedSeconds % 60;

        return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
    }
}
