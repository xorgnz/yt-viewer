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

        return '';
    }

    getConsumedDurationLabel(): string
    {
        return this.formatDuration(this.virtualChannel.timerUsageSeconds);
    }

    getTotalDurationLabel(): string | null
    {
        if (this.virtualChannel.dailyTimerMax == null || this.virtualChannel.timerState === 'unlimited') {
            return null;
        }

        return this.formatDuration(this.virtualChannel.dailyTimerMax);
    }

    private formatDuration(seconds: number): string
    {
        const normalizedSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(normalizedSeconds / 60);
        const remainderSeconds = normalizedSeconds % 60;

        return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
    }
}
