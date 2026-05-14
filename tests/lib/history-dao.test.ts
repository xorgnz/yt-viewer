import { describe, expect, it } from 'vitest';
import { HistoryDAO } from '../../src/lib/daos/historyDAO';
import { MockQueryProvider } from '../helpers/MockQueryProvider';

describe('HistoryDAO', () => {
    it('aggregates virtual-channel watch seconds within a bounded window', async () => {
        const provider = new MockQueryProvider((text) => {
            if (text.includes('COALESCE(SUM(h.time_watched_seconds), 0) AS totalWatchSeconds')) {
                return MockQueryProvider.result([{ totalWatchSeconds: 245 }]);
            }

            return undefined;
        });
        const dao = new HistoryDAO(provider as never);

        const totalWatchSeconds = await dao.getVirtualChannelWatchSecondsInWindow(
            7,
            13,
            1_000,
            2_000
        );

        expect(totalWatchSeconds).toBe(245);
        expect(provider.calls).toEqual([
            {
                text: `
            SELECT COALESCE(SUM(h.time_watched_seconds), 0) AS totalWatchSeconds
            FROM watch_history h
            INNER JOIN videos v
                ON v.video_id = h.video_id
            INNER JOIN virtual_channel_assignments a
                ON a.src_channel_id = v.src_channel_id
            WHERE h.profile_id = ?
              AND a.vchannel_id = ?
              AND h.last_updated_at >= ?
              AND h.last_updated_at < ?
        `,
                values: ['7', '13', 1_000, 2_000],
            }
        ]);
    });

    it('returns zero when no watch-history rows match the requested window', async () => {
        const provider = new MockQueryProvider(() => MockQueryProvider.result([]));
        const dao = new HistoryDAO(provider as never);

        await expect(dao.getVirtualChannelWatchSecondsInWindow(
            2,
            5,
            10_000,
            20_000
        )).resolves.toBe(0);
    });
});
// apply-patch-anchor - do not delete
