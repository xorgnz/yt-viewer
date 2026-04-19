import fs from 'node:fs';
import path from 'node:path';

export enum DatabaseMode
{
    Test = 'test',
    Dev = 'dev',
    Live = 'live'
}

type DatabaseFileNames = {
    test: string;
    dev: string;
    live: string;
};

export class DatabaseFileLayout
{
    private readonly baseDir: string;
    private readonly fileNames: DatabaseFileNames;

    constructor(options?: {
        baseDir?: string;
        fileNames?: Partial<DatabaseFileNames>;
    })
    {
        this.baseDir = options?.baseDir || process.env.YTCW_DB_DIR || '.data';
        const defaults = {
            test: 'test.db',
            dev: 'dev.db',
            live: process.env.YTCW_DB_FILE || 'app.db'
        } as const;

        this.fileNames = {
            test: options?.fileNames?.test || defaults.test,
            dev: options?.fileNames?.dev || defaults.dev,
            live: options?.fileNames?.live || defaults.live
        };
    }

    resolveDatabasePath(mode: DatabaseMode): string
    {
        const fileName = mode === DatabaseMode.Test
            ? this.fileNames.test
            : mode === DatabaseMode.Dev
                ? this.fileNames.dev
                : this.fileNames.live;

        return path.resolve(process.cwd(), this.baseDir, fileName);
    }

    ensureParentDirectory(filePath: string): void
    {
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    createTimestampedArtifactPath(filePath: string, artifactLabel: string, date: Date = new Date()): string
    {
        const parsedPath = path.parse(filePath);
        const timestamp = DatabaseFileLayout.formatTimestamp(date);

        return path.join(parsedPath.dir, `${parsedPath.name}-${timestamp}.${artifactLabel}${parsedPath.ext}`);
    }

    private static formatTimestamp(date: Date): string
    {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }
}
// apply-patch-anchor - do not delete