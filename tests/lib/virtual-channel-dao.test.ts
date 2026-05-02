import { describe, expect, it } from 'vitest';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';
import { VirtualChannelDAO } from '../../src/lib/daos/virtualChannelDAO';
import { MockQueryProvider } from '../helpers/MockQueryProvider';

describe('VirtualChannelDAO', () => {
    it('creates uncapped virtual channels with a null timer value by default', async () => {
        const provider = new MockQueryProvider((text) => {
            if (text.includes('INSERT INTO virtual_channels')) {
                return MockQueryProvider.result([], { affectedRows: 1, insertId: 17 });
            }

            return undefined;
        });
        const dao = new VirtualChannelDAO(provider as never);

        const result = await dao.create('Queue');

        expect(result).toBeInstanceOf(VirtualChannel);
        expect(result).toMatchObject({
            id: 17,
            name: 'Queue',
            dailyTimerMax: null
        });
        expect(provider.calls).toEqual([
            {
                text: 'INSERT INTO virtual_channels(name, daily_timer_max) VALUES(?, ?)',
                values: ['Queue', null]
            }
        ]);
    });

    it('hydrates timer values from get/list queries and persists timer updates', async () => {
        const provider = new MockQueryProvider((text, values) => {
            if (text.includes('WHERE id = ?')) {
                return MockQueryProvider.result([
                    { id: Number(values[0]), name: 'Timers', dailyTimerMax: 45 }
                ]);
            }

            if (text.includes('ORDER BY name')) {
                return MockQueryProvider.result([
                    { id: 1, name: 'Alpha', dailyTimerMax: null },
                    { id: 2, name: 'Bravo', dailyTimerMax: 30 }
                ]);
            }

            return MockQueryProvider.result([], { affectedRows: 1 });
        });
        const dao = new VirtualChannelDAO(provider as never);

        const single = await dao.get(9);
        const list = await dao.list();
        await dao.updateDailyTimerMax(2, 90);

        expect(single).toBeInstanceOf(VirtualChannel);
        expect(single).toMatchObject({
            id: 9,
            name: 'Timers',
            dailyTimerMax: 45
        });
        expect(list).toHaveLength(2);
        expect(list[0]).toMatchObject({ id: 1, name: 'Alpha', dailyTimerMax: null });
        expect(list[1]).toMatchObject({ id: 2, name: 'Bravo', dailyTimerMax: 30 });
        expect(provider.calls.at(-1)).toEqual({
            text: 'UPDATE virtual_channels SET daily_timer_max = ? WHERE id = ?',
            values: [90, 2]
        });
    });
});
// apply-patch-anchor - do not delete
