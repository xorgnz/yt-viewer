import type { HistoryDAO } from '$lib/daos/historyDAO';
import type { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AppTimezonePolicy } from '$lib/server/AppTimezonePolicy';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerVirtualChannel, ViewerVirtualChannelTimerState } from '$lib/viewer/types';

export class ViewerVirtualChannelService
{
    private readonly virtualChannelDAO: Pick<VirtualChannelDAO, 'get' | 'list'>;
    private readonly historyDAO: Pick<HistoryDAO, 'getVirtualChannelWatchSecondsInWindow' | 'resetVirtualChannelWatchSecondsInWindow'>;
    private readonly profileContext: ServerProfileContext;
    private readonly nowProvider: () => number;

    constructor(
        virtualChannelDAO: Pick<VirtualChannelDAO, 'get' | 'list'>,
        historyDAO: Pick<HistoryDAO, 'getVirtualChannelWatchSecondsInWindow' | 'resetVirtualChannelWatchSecondsInWindow'>,
        profileContext: ServerProfileContext,
        nowProvider: () => number = () => Date.now()
    )
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.historyDAO = historyDAO;
        this.profileContext = profileContext;
        this.nowProvider = nowProvider;
    }

    async loadNavigation()
    {
        return {
            groups: await this.loadVirtualChannels(),
            profileKey: this.profileContext.activeProfileKey
        };
    }

    async loadVirtualChannels(): Promise<ViewerVirtualChannel[]>
    {
        const groups = await this.virtualChannelDAO.list();
        const timezone = AppTimezonePolicy.configuredTimezone;
        const now = this.nowProvider();
        const window = ViewerVirtualChannelService.getCurrentDayWindow(now, timezone);

        return await Promise.all(groups.map((group) => this.buildGroupView(group, window)));
    }

    async getVirtualChannelById(virtualChannelId: number): Promise<ViewerVirtualChannel | null>
    {
        const group = await this.virtualChannelDAO.get(virtualChannelId);
        if (!group) {
            return null;
        }

        const timezone = AppTimezonePolicy.configuredTimezone;
        const now = this.nowProvider();
        const window = ViewerVirtualChannelService.getCurrentDayWindow(now, timezone);

        return await this.buildGroupView(group, window);
    }

    async resetVirtualChannelTimer(virtualChannelId: number): Promise<boolean>
    {
        const group = await this.virtualChannelDAO.get(virtualChannelId);
        if (!group) {
            return false;
        }

        const timezone = AppTimezonePolicy.configuredTimezone;
        const now = this.nowProvider();
        const window = ViewerVirtualChannelService.getCurrentDayWindow(now, timezone);

        await this.historyDAO.resetVirtualChannelWatchSecondsInWindow(
            this.profileContext.activeProfileId,
            virtualChannelId,
            window.startMs,
            window.endMs
        );

        return true;
    }

    private static getCurrentDayWindow(nowMs: number, timezone: string): { startMs: number; endMs: number }
    {
        const today = ViewerVirtualChannelService.getZonedDateTimeParts(nowMs, timezone);
        const startMs = ViewerVirtualChannelService.getUtcTimeForZonedDateTime(
            today.year,
            today.month,
            today.day,
            0,
            0,
            0,
            timezone
        );
        const endMs = ViewerVirtualChannelService.getUtcTimeForZonedDateTime(
            today.year,
            today.month,
            today.day + 1,
            0,
            0,
            0,
            timezone
        );

        return { startMs, endMs };
    }

    private static getUtcTimeForZonedDateTime(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        timezone: string
    ): number
    {
        const localUtcGuess = Date.UTC(year, month - 1, day, hour, minute, second, 0);
        let resolvedUtcMs = localUtcGuess;

        for (let index = 0; index < 3; index += 1) {
            const offsetMs = ViewerVirtualChannelService.getTimezoneOffsetMs(resolvedUtcMs, timezone);
            const adjustedUtcMs = localUtcGuess - offsetMs;

            if (adjustedUtcMs === resolvedUtcMs) {
                return adjustedUtcMs;
            }

            resolvedUtcMs = adjustedUtcMs;
        }

        return resolvedUtcMs;
    }

    private static getTimezoneOffsetMs(utcMs: number, timezone: string): number
    {
        const zoned = ViewerVirtualChannelService.getZonedDateTimeParts(utcMs, timezone);
        const zonedAsUtcMs = Date.UTC(
            zoned.year,
            zoned.month - 1,
            zoned.day,
            zoned.hour,
            zoned.minute,
            zoned.second,
            0
        );
        const roundedUtcMs = utcMs - (utcMs % 1000);

        return zonedAsUtcMs - roundedUtcMs;
    }

    private static getZonedDateTimeParts(utcMs: number, timezone: string): ZonedDateTimeParts
    {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        });
        const parts = formatter.formatToParts(new Date(utcMs));
        const values = new Map(parts.map((part) => [part.type, part.value]));

        return {
            year: Number(values.get('year')),
            month: Number(values.get('month')),
            day: Number(values.get('day')),
            hour: Number(values.get('hour')),
            minute: Number(values.get('minute')),
            second: Number(values.get('second')),
        };
    }

    private async buildGroupView(
        group: {
            id: number;
            name: string;
            dailyTimerMax: number | null;
        },
        window: { startMs: number; endMs: number }
    ): Promise<ViewerVirtualChannel>
    {
        const dailyTimerMax = group.dailyTimerMax;

        if (dailyTimerMax == null) {
            return {
                id: group.id,
                name: group.name,
                dailyTimerMax: null,
                timerState: 'unlimited' as ViewerVirtualChannelTimerState,
                timerUsageSeconds: 0,
                timerRemainingSeconds: null,
                timerWindowStartMs: window.startMs,
                timerWindowEndMs: window.endMs,
            };
        }

        const timerUsageSeconds = await this.historyDAO.getVirtualChannelWatchSecondsInWindow(
            this.profileContext.activeProfileId,
            group.id,
            window.startMs,
            window.endMs
        );
        const timerMaxSeconds = dailyTimerMax;
        const timerRemainingSeconds = Math.max(0, timerMaxSeconds - timerUsageSeconds);

        return {
            id: group.id,
            name: group.name,
            dailyTimerMax,
            timerState: timerUsageSeconds >= timerMaxSeconds ? 'capped' : 'available',
            timerUsageSeconds,
            timerRemainingSeconds,
            timerWindowStartMs: window.startMs,
            timerWindowEndMs: window.endMs,
        };
    }
}
// apply-patch-anchor - do not delete

type ZonedDateTimeParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};
