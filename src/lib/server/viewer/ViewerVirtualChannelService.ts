import type { HistoryDAO } from '$lib/daos/historyDAO';
import type { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { VirtualChannel } from '$lib/entities/virtualChannel';
import { AppTimezonePolicy } from '$lib/server/AppTimezonePolicy';
import type { ServerProfileContext } from '$lib/server/ServerProfileContext';
import type { ViewerVirtualChannel } from '$lib/viewer/types';
import { viewerVirtualChannelTimer } from '$lib/viewer/ViewerVirtualChannelTimer';

export class ViewerVirtualChannelService
{
    private readonly virtualChannelDAO: VirtualChannelDAO;
    private readonly historyDAO: HistoryDAO;
    private readonly profileContext: ServerProfileContext;
    private readonly nowProvider: () => number;

    constructor(
        virtualChannelDAO: VirtualChannelDAO,
        historyDAO: HistoryDAO,
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
            virtualChannels: await this.loadVirtualChannels(),
            profileKey: this.profileContext.activeProfileKey
        };
    }

    async loadVirtualChannels(): Promise<ViewerVirtualChannel[]>
    {
        const virtualChannels = await this.virtualChannelDAO.list();
        const timezone = AppTimezonePolicy.configuredTimezone;
        const now = this.nowProvider();
        const window = ViewerVirtualChannelService.getCurrentDayWindow(now, timezone);

        return await Promise.all(virtualChannels.map((virtualChannel) => this.buildVirtualChannelView(virtualChannel, window)));
    }

    async getVirtualChannelById(virtualChannelId: string | number): Promise<ViewerVirtualChannel | null>
    {
        const virtualChannel = await this.virtualChannelDAO.get(virtualChannelId);
        if (!virtualChannel) {
            return null;
        }

        const timezone = AppTimezonePolicy.configuredTimezone;
        const now = this.nowProvider();
        const window = ViewerVirtualChannelService.getCurrentDayWindow(now, timezone);

        return await this.buildVirtualChannelView(virtualChannel, window);
    }

    async resetVirtualChannelTimer(virtualChannelId: string | number): Promise<boolean>
    {
        const virtualChannel = await this.virtualChannelDAO.get(virtualChannelId);
        if (!virtualChannel) {
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

    async consumeExtraTimerSecondsForWatchDelta(
        virtualChannelId: string | number,
        virtualChannel: ViewerVirtualChannel | null,
        consumedSecondsDelta: number
    ): Promise<void>
    {
        if (!virtualChannel || virtualChannel.dailyTimerMax == null) {
            return;
        }

        const advanceResult = viewerVirtualChannelTimer.advanceSnapshot(
            virtualChannel,
            consumedSecondsDelta
        );
        if (advanceResult.extraTimerSecondsConsumed === 0) {
            return;
        }

        const nextExtraTimerSecondsRemaining = advanceResult.virtualChannel.extraTimerSecondsRemaining;
        if (nextExtraTimerSecondsRemaining === virtualChannel.extraTimerSecondsRemaining) {
            return;
        }

        await this.virtualChannelDAO.updateExtraTimerSecondsRemaining(
            virtualChannelId,
            nextExtraTimerSecondsRemaining
        );
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

    private async buildVirtualChannelView(
        virtualChannel: VirtualChannel,
        window: { startMs: number; endMs: number }
    ): Promise<ViewerVirtualChannel>
    {
        if (virtualChannel.dailyTimerMax == null) {
            return viewerVirtualChannelTimer.createSnapshot(virtualChannel, 0, window);
        }

        const timerUsageSeconds = Number(await this.historyDAO.getVirtualChannelWatchSecondsInWindow(
            this.profileContext.activeProfileId,
            virtualChannel.id,
            window.startMs,
            window.endMs
        ));

        return viewerVirtualChannelTimer.createSnapshot(virtualChannel, timerUsageSeconds, window);
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
