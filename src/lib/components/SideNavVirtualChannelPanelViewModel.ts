export type SideNavVirtualChannelViewModel = {
    id: number;
    name: string;
    dailyTimerMax: number | null;
    timerState: 'unlimited' | 'available' | 'capped';
    timerUsageSeconds: number;
    timerRemainingSeconds: number | null;
    timerWindowStartMs: number;
    timerWindowEndMs: number;
};
