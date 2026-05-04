import { describe, expect, it } from 'vitest';
import { SideNavVirtualChannelPanelPresenter } from '../../src/lib/components/SideNavVirtualChannelPanelPresenter';
import type { SideNavVirtualChannelViewModel } from '../../src/lib/components/SideNavVirtualChannelPanelViewModel';

describe('SideNavVirtualChannelPanelPresenter', () => {
    function createViewModel(
        overrides: Partial<SideNavVirtualChannelViewModel> = {}
    ): SideNavVirtualChannelViewModel
    {
        return {
            id: 1,
            name: 'Timers',
            dailyTimerMax: 60,
            timerState: 'available',
            timerUsageSeconds: 1200,
            timerRemainingSeconds: 2400,
            timerWindowStartMs: 100,
            timerWindowEndMs: 200,
            ...overrides
        };
    }

    it('formats unlimited virtual channel status and usage', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: null,
            timerState: 'unlimited',
            timerUsageSeconds: 1860,
            timerRemainingSeconds: null
        }));

        expect(presenter.getTimerModeLabel()).toBe('Unlimited');
        expect(presenter.getTimerUsageLabel()).toBe('Used today: 31 min');
    });

    it('formats available limited virtual channel status and remaining time', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: 90,
            timerState: 'available',
            timerUsageSeconds: 1800,
            timerRemainingSeconds: 3600
        }));

        expect(presenter.getTimerModeLabel()).toBe('Daily limit: 90 min');
        expect(presenter.getTimerUsageLabel()).toBe('Remaining: 60 min');
    });

    it('formats capped virtual channel status and consumed usage', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: 45,
            timerState: 'capped',
            timerUsageSeconds: 2700,
            timerRemainingSeconds: 0
        }));

        expect(presenter.getTimerModeLabel()).toBe('Limit reached');
        expect(presenter.getTimerUsageLabel()).toBe('Used today: 45 / 45 min');
    });
});
