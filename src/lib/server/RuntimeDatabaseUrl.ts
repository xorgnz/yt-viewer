export function requireDatabaseUrlForRuntime(
    contextLabel: string,
    options?: {
        nodeEnv?: string | undefined;
        allowMissingInTest?: boolean;
    }
): string
{
    const nodeEnv = (options?.nodeEnv ?? process.env.NODE_ENV ?? 'development').toLowerCase();
    const allowMissingInTest = options?.allowMissingInTest ?? true;
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (databaseUrl) {
        return databaseUrl;
    }

    if (allowMissingInTest && nodeEnv === 'test') {
        return '';
    }

    throw new Error(`${contextLabel} requires DATABASE_URL to be set.`);
}
// apply-patch-anchor - do not delete