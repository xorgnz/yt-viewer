import { describe, expect, it } from 'vitest';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';
import { MockQueryProvider } from '../helpers/MockQueryProvider';

describe('VirtualChannelDAO', () => {
    it('creates uncapped virtual channels with a null timer value by default', async () => {
        const provider = new MockQueryProvider((text) => {
            if (text.includes('INSERT INTO virtual_channels')) {
                return MockQueryProvider.result([], { affectedRows: 1 });
            }

            return undefined;
        });
        const dao = new VirtualChannelDAO(provider as never, () => 'vc_demo1234567890');

        const result = await dao.create('Queue');

        expect(result).toBeInstanceOf(VirtualChannel);
        expect(result).toMatchObject({
            id: 'vc_demo1234567890',
            name: 'Queue',
            dailyTimerMax: null
        });
        expect(provider.calls).toEqual([
            {
                text: 'INSERT INTO virtual_channels(vchannel_id, name, daily_timer_max) VALUES(?, ?, ?)',
                values: ['vc_demo1234567890', 'Queue', null]
            }
        ]);
    });

    it('hydrates timer values from get/list queries and persists timer updates', async () => {
        const provider = new MockQueryProvider((text, values) => {
            if (text.includes('WHERE vchannel_id = ?')) {
                return MockQueryProvider.result([
                    { id: String(values[0]), name: 'Timers', dailyTimerMax: 45 }
                ]);
            }

            if (text.includes('ORDER BY name')) {
                return MockQueryProvider.result([
                    { id: 'vc_alpha', name: 'Alpha', dailyTimerMax: null },
                    { id: 'vc_bravo', name: 'Bravo', dailyTimerMax: 30 }
                ]);
            }

            return MockQueryProvider.result([], { affectedRows: 1 });
        });
        const dao = new VirtualChannelDAO(provider as never);

        const single = await dao.get('vc_timers');
        const list = await dao.list();
        await dao.updateDailyTimerMax('vc_bravo', 90);

        expect(single).toBeInstanceOf(VirtualChannel);
        expect(single).toMatchObject({
            id: 'vc_timers',
            name: 'Timers',
            dailyTimerMax: 45
        });
        expect(list).toHaveLength(2);
        expect(list[0]).toMatchObject({ id: 'vc_alpha', name: 'Alpha', dailyTimerMax: null });
        expect(list[1]).toMatchObject({ id: 'vc_bravo', name: 'Bravo', dailyTimerMax: 30 });
        expect(provider.calls.at(-1)).toEqual({
            text: 'UPDATE virtual_channels SET daily_timer_max = ? WHERE vchannel_id = ?',
            values: [90, 'vc_bravo']
        });
    });

    it('retries virtual channel id generation after a duplicate-key insert error', async () => {
        let insertCount = 0;
        const provider = new MockQueryProvider((text) => {
            if (text.includes('INSERT INTO virtual_channels')) {
                insertCount += 1;

                if (insertCount === 1) {
                    const error: any = new Error('duplicate');
                    error.code = 'ER_DUP_ENTRY';
                    throw error;
                }

                return MockQueryProvider.result([], { affectedRows: 1 });
            }

            return undefined;
        });
        const ids = ['vc_duplicate000000', 'vc_unique000000000'];
        const dao = new VirtualChannelDAO(provider as never, () => ids.shift() || 'vc_fallback0000000');

        const result = await dao.create('Queue');

        expect(result.id).toBe('vc_unique000000000');
        expect(provider.calls).toHaveLength(2);
    });
});
// apply-patch-anchor - do not delete
