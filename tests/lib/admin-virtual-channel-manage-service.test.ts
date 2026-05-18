import { describe, expect, it } from 'vitest';
import { AdminVirtualChannelManageService } from '../../src/lib/server/admin/AdminVirtualChannelManageService';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';

function createService(options?: {
    virtualChannel?: VirtualChannel | undefined;
})
{
    const calls: Array<{ id: string | number; additionalSeconds: number }> = [];
    const virtualChannelDAO = {
        async get()
        {
            return options?.virtualChannel;
        },
        async updateDailyTimerMax()
        {
            return;
        },
        async incrementExtraTimerSecondsRemaining(id: string | number, additionalSeconds: number)
        {
            calls.push({ id, additionalSeconds });
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
    it('increments the persisted extra timer balance for an existing virtual channel', async () => {
        const { service, calls } = createService({
            virtualChannel: new VirtualChannel({
                id: 'vc_demo',
                name: 'Demo',
                dailyTimerMax: 120,
                extraTimerSecondsRemaining: 30
            })
        });

        const result = await service.grantExtraTimerSeconds('vc_demo', 45);

        expect(result).toEqual({
            ok: true,
            data: '/admin/virtual-channels/vc_demo'
        });
        expect(calls).toEqual([
            {
                id: 'vc_demo',
                additionalSeconds: 45
            }
        ]);
    });

    it('returns a not-found error when granting extra time to a missing virtual channel', async () => {
        const { service, calls } = createService();

        const result = await service.grantExtraTimerSeconds('vc_missing', 45);

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
