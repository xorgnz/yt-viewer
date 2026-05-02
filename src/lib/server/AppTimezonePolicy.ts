export class AppTimezonePolicy
{
    private static readonly DEFAULT_TIMEZONE = 'UTC';

    static get configuredTimezone(): string
    {
        const configuredTimezone = String(process.env.APP_TIMEZONE || '').trim();

        if (!configuredTimezone) {
            return AppTimezonePolicy.DEFAULT_TIMEZONE;
        }

        return AppTimezonePolicy.isValidTimezone(configuredTimezone)
            ? configuredTimezone
            : AppTimezonePolicy.DEFAULT_TIMEZONE;
    }

    private static isValidTimezone(timezone: string): boolean
    {
        try {
            Intl.DateTimeFormat('en-US', { timeZone: timezone });
            return true;
        } catch {
            return false;
        }
    }
}
// apply-patch-anchor - do not delete
