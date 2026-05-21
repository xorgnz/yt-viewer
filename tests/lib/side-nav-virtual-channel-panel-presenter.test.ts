import { describe, expect, it } from 'vitest';
import { SideNavVirtualChannelPanelPresenter } from '../../src/lib/components/SideNavVirtualChannelPanelPresenter';
import type { SideNavVirtualChannelViewModel } from '../../src/lib/components/SideNavVirtualChannelPanelViewModel';
import { ViewerVirtualChannelTimerState } from '../../src/lib/viewer/types';

describe('SideNavVirtualChannelPanelPresenter', () => {
    function createViewModel(
        overrides: Partial<SideNavVirtualChannelViewModel> = {}
    ): SideNavVirtualChannelViewModel
    {
        return {
            id: 'vc_demo',
            name: 'Timers',
            dailyTimerMax: 60,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 1200,
            timerRemainingSeconds: 2400,
            dailyTimerRemainingSeconds: 2400,
            extraTimerSecondsRemaining: 0,
            combinedTimerRemainingSeconds: 2400,
            timerWindowStartMs: 100,
            timerWindowEndMs: 200,
            ...overrides
        };
    }

    it('formats unlimited virtual channel status and usage', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: null,
            timerState: ViewerVirtualChannelTimerState.Unlimited,
            timerUsageSeconds: 1860,
            timerRemainingSeconds: null
        }), true);

        expect(presenter.getTimerModeLabel()).toBe('Unlimited');
        expect(presenter.getConsumedDurationLabel()).toBe('31:00');
        expect(presenter.getTotalDurationLabel()).toBeNull();
        expect(presenter.getDailyAllowanceLabel()).toBeNull();
        expect(presenter.getExtraRemainingLabel()).toBeNull();
    });

    it('shows split daily and extra timer details when split mode is enabled', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: 90,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 18,
            timerRemainingSeconds: 72,
            extraTimerSecondsRemaining: 30
        }), true);

        expect(presenter.getTimerModeLabel()).toBe('');
        expect(presenter.getConsumedDurationLabel()).toBe('0:18');
        expect(presenter.getTotalDurationLabel()).toBe('1:30');
        expect(presenter.getDailyAllowanceLabel()).toBe('1:30');
        expect(presenter.getExtraRemainingLabel()).toBe('0:30');
    });

    it('hides split timer details when split mode is disabled', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: 90,
            timerState: ViewerVirtualChannelTimerState.Available,
            timerUsageSeconds: 18,
            timerRemainingSeconds: 72,
            extraTimerSecondsRemaining: 30
        }), false);

        expect(presenter.getDailyAllowanceLabel()).toBeNull();
        expect(presenter.getExtraRemainingLabel()).toBeNull();
    });

    it('formats capped virtual channel status and consumed usage', () => {
        const presenter = new SideNavVirtualChannelPanelPresenter(createViewModel({
            dailyTimerMax: 45,
            timerState: ViewerVirtualChannelTimerState.Capped,
            timerUsageSeconds: 45,
            timerRemainingSeconds: 0
        }), true);

        expect(presenter.getTimerModeLabel()).toBe('');
        expect(presenter.getConsumedDurationLabel()).toBe('0:45');
        expect(presenter.getTotalDurationLabel()).toBe('0:45');
        expect(presenter.getDailyAllowanceLabel()).toBe('0:45');
    });
});
