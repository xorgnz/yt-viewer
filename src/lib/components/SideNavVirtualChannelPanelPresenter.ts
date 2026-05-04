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

        return `Daily limit: ${this.virtualChannel.dailyTimerMax} min`;
    }

    getTimerUsageLabel(): string
    {
        if (this.virtualChannel.timerState === 'unlimited' || this.virtualChannel.dailyTimerMax == null) {
            return `Used today: ${this.formatMinutesFromSeconds(this.virtualChannel.timerUsageSeconds)} min`;
        }

        if (this.virtualChannel.timerState === 'capped') {
            return `Used today: ${this.formatMinutesFromSeconds(this.virtualChannel.timerUsageSeconds)} / ${this.virtualChannel.dailyTimerMax} min`;
        }

        return `Remaining: ${this.formatMinutesFromSeconds(this.virtualChannel.timerRemainingSeconds ?? 0)} min`;
    }

    private formatMinutesFromSeconds(seconds: number): string
    {
        return String(Math.max(0, Math.floor(seconds / 60)));
    }
}
