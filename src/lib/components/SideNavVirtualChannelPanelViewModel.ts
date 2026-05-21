import type { ViewerVirtualChannelTimerState } from '$lib/viewer/types';

export type SideNavVirtualChannelViewModel = {
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
