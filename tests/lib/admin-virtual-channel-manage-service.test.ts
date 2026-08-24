import { describe, expect, it } from 'vitest';
import { AdminVirtualChannelManageService } from '../../src/lib/server/admin/AdminVirtualChannelManageService';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';

function createService(options?: {
    virtualChannel?: VirtualChannel | undefined;
})
{
    const calls: Array<{ method: string; id: string | number; value: number | null }> = [];
    const virtualChannelDAO = {
        async get()
        {
            return options?.virtualChannel;
        },
        async updateDailyTimerMax(id: string | number, dailyTimerMax: number | null)
        {
            calls.push({ method: 'daily', id, value: dailyTimerMax });
        },
        async updateExtraTimerSecondsRemaining(id: string | number, extraTimerSecondsRemaining: number)
        {
            calls.push({ method: 'extra', id, value: extraTimerSecondsRemaining });
        }
    };

    const service = new AdminVirtualChannelManageService(
        virtualChannelDAO as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
    );

    return { service, calls };
}

describe('AdminVirtualChannelManageService', () => {
    it('updates the persisted daily and extra timer balances for an existing virtual channel', async () => {
        const { service, calls } = createService({
            virtualChannel: new VirtualChannel({
                id: 'vc_demo',
                name: 'Demo',
                dailyTimerMax: 120,
                extraTimerSecondsRemaining: 30
            })
        });

        const result = await service.updateTimerSettings('vc_demo', 120, 45);

        expect(result).toEqual({
            ok: true,
            data: '/admin/virtual-channels/vc_demo'
        });
        expect(calls).toEqual([
            {
                method: 'daily',
                id: 'vc_demo',
                value: 120
            },
            {
                method: 'extra',
                id: 'vc_demo',
                value: 45
            }
        ]);
    });

    it('returns a not-found error when updating extra time for a missing virtual channel', async () => {
        const { service, calls } = createService();

        const result = await service.updateTimerSettings('vc_missing', 120, 45);

        expect(result).toEqual({
            ok: false,
            error: {
                code: 'virtual_channel_not_found',
                status: 404,
                message: 'Virtual channel not found'
            }
        });
        expect(calls).toEqual([]);
    });
});
