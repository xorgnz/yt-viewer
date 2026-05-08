import { afterEach, describe, expect, it } from 'vitest';
import { AppTimezonePolicy } from '../../src/lib/server/AppTimezonePolicy';

describe('AppTimezonePolicy', () => {
    const previousAppTimezone = process.env.APP_TIMEZONE;

    afterEach(() => {
        if (typeof previousAppTimezone === 'undefined') {
            delete process.env.APP_TIMEZONE;
        } else {
            process.env.APP_TIMEZONE = previousAppTimezone;
        }
    });

    it('uses the configured timezone when it is a valid IANA identifier', () => {
        process.env.APP_TIMEZONE = 'America/Los_Angeles';

        expect(AppTimezonePolicy.configuredTimezone).toBe('America/Los_Angeles');
    });

    it('falls back to UTC when no timezone is configured', () => {
        delete process.env.APP_TIMEZONE;

        expect(AppTimezonePolicy.configuredTimezone).toBe('UTC');
    });

    it('falls back to UTC when the configured timezone is invalid', () => {
        process.env.APP_TIMEZONE = 'Not/A_Real_Timezone';

        expect(AppTimezonePolicy.configuredTimezone).toBe('UTC');
    });
});
// apply-patch-anchor - do not delete
