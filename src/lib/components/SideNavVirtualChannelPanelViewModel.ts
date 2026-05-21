export type SideNavVirtualChannelViewModel = {
    id: string | number;
    name: string;
    dailyTimerMax: number | null;
    timerState: 'unlimited' | 'available' | 'capped';
    timerUsageSeconds: number;
    timerRemainingSeconds: number | null;
    dailyTimerRemainingSeconds: number | null;
    extraTimerSecondsRemaining: number;
    combinedTimerRemainingSeconds: number | null;
    timerWindowStartMs: number;
    timerWindowEndMs: number;
};
