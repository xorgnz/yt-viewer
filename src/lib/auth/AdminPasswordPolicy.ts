export class AdminPasswordPolicy
{
    private static readonly DEFAULT_PASSWORD = 'admin';

    static get configuredPassword(): string
    {
        return process.env.ADMIN_PASSWORD || AdminPasswordPolicy.DEFAULT_PASSWORD;
    }

    static verify(password: string): boolean
    {
        return String(password) === String(AdminPasswordPolicy.configuredPassword);
    }
}
