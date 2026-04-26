export class ProfileSwitchPasswordPolicy
{
    private static readonly DEFAULT_PASSWORD = 'adult';

    static get configuredPassword(): string
    {
        return process.env.PROFILE_SWITCH_PASSWORD || ProfileSwitchPasswordPolicy.DEFAULT_PASSWORD;
    }

    static verify(password: string): boolean
    {
        return String(password) === String(ProfileSwitchPasswordPolicy.configuredPassword);
    }
}
// apply-patch-anchor - do not delete
