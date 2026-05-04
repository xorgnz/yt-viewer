import type { SideNavVirtualChannelViewModel } from '$lib/components/SideNavVirtualChannelPanelViewModel';

export class SideNavVirtualChannelPanelPresenter
{
    private readonly virtualChannel: SideNavVirtualChannelViewModel;

    constructor(virtualChannel: SideNavVirtualChannelViewModel)
    {
        this.virtualChannel = virtualChannel;
    }

    getTimerModeLabel(): string
    {
        if (this.virtualChannel.timerState === 'unlimited' || this.virtualChannel.dailyTimerMax == null) {
            return 'Unlimited';
        }

        if (this.virtualChannel.timerState === 'capped') {
            return 'Limit reached';
        }

        return `Daily limit: ${this.formatSeconds(this.virtualChannel.dailyTimerMax)} sec`;
    }

    getTimerUsageLabel(): string
    {
        if (this.virtualChannel.timerState === 'unlimited' || this.virtualChannel.dailyTimerMax == null) {
            return `Consumed: ${this.formatSeconds(this.virtualChannel.timerUsageSeconds)} sec`;
        }

        if (this.virtualChannel.timerState === 'capped') {
            return `Consumed: ${this.formatSeconds(this.virtualChannel.timerUsageSeconds)} sec`;
        }

        return `Consumed: ${this.formatSeconds(this.virtualChannel.timerUsageSeconds)} sec`;
    }

    getTimerRemainingLabel(): string
    {
        if (this.virtualChannel.dailyTimerMax == null || this.virtualChannel.timerState === 'unlimited') {
            return 'Remaining: unlimited';
        }

        return `Remaining: ${this.formatSeconds(this.virtualChannel.timerRemainingSeconds ?? 0)} sec`;
    }

    private formatSeconds(seconds: number): string
    {
        return String(Math.max(0, Math.floor(seconds)));
    }
}
