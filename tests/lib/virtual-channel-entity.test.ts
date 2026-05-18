import { describe, expect, it } from 'vitest';
import { VirtualChannel } from '../../src/lib/entities/virtualChannel';

describe('VirtualChannel', () => {
    it('rejects values with an undefined daily timer max', () => {
        expect(VirtualChannel.validate({
            id: 'vc_demo',
            name: 'Demo',
            extraTimerSecondsRemaining: 0,
            dailyTimerMax: undefined
        })).toBe(false);
    });

    it('rejects values with an undefined extra timer balance', () => {
        expect(VirtualChannel.validate({
            id: 'vc_demo',
            name: 'Demo',
            dailyTimerMax: null,
            extraTimerSecondsRemaining: undefined
        })).toBe(false);
    });

    it('accepts null and numeric daily timer max values', () => {
        expect(VirtualChannel.validate({
            id: 'vc_unlimited',
            name: 'Unlimited',
            dailyTimerMax: null,
            extraTimerSecondsRemaining: 0
        })).toBe(true);

        expect(VirtualChannel.validate({
            id: 'vc_capped',
            name: 'Capped',
            dailyTimerMax: 120,
            extraTimerSecondsRemaining: 30
        })).toBe(true);
    });
});
// apply-patch-anchor - do not delete
