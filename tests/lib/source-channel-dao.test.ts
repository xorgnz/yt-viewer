import { describe, expect, it } from 'vitest';
import { SourceChannelDAO } from '../../src/lib/daos/sourceChannelDAO';
import { MockQueryProvider } from '../helpers/MockQueryProvider';

describe('SourceChannelDAO', () => {
    it('lists only source channels assigned to the requested virtual channel', async () => {
        const provider = new MockQueryProvider(() => MockQueryProvider.result([
            {
                id: 'channel-1',
                title: 'Channel One',
                description: '',
                thumbnailUrl: null,
                publishedAt: null,
                lastRefreshedAt: null
            }
        ]));

        const channels = await new SourceChannelDAO(provider).listForVirtualChannel('vc-one');

        expect(channels.map((channel) => channel.id)).toEqual(['channel-1']);
        expect(provider.calls).toHaveLength(1);
        expect(provider.calls[0].text).toContain('INNER JOIN virtual_channel_assignments vca ON vca.src_channel_id = sc.src_channel_id');
        expect(provider.calls[0].text).toContain('WHERE vca.vchannel_id = ?');
        expect(provider.calls[0].values).toEqual(['vc-one']);
    });
});
// apply-patch-anchor - do not delete
