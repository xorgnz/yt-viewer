import { describe, expect, it } from 'vitest';
import { MYSQL_CREATE_TABLE_META } from '../../src/lib/daos/_schema';
import type { AsyncMigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import { runCreateDatabaseWorkflow } from '../../scripts/create_database';
import { runMigrationWorkflow } from '../../scripts/migrate_database';
import { MockMySqlProvider } from '../helpers/MockMySqlProvider';

function createProvider(): MockMySqlProvider
{
    return new MockMySqlProvider((sql) => {
        if (sql.includes('SELECT value FROM _meta')) {
            return MockMySqlProvider.result([{ value: '7' }]);
        }

        return undefined;
    });
}

describe('database setup scripts', () => {
    it('bootstraps the latest MySQL schema without SQLite file operations', async () => {
        const client = createProvider();

        await runCreateDatabaseWorkflow({
            pool: client,
        });

        expect(client.calls[0].text).toBe('START TRANSACTION');
        expect(client.calls.some((call) => MYSQL_CREATE_TABLE_META.includes(call.text))).toBe(true);
        expect(client.calls.at(-1)?.text).toBe('COMMIT');
    });

    it('runs registered MySQL migrations without SQLite file operations', async () => {
        const client = createProvider();

        const result = await runMigrationWorkflow({
            pool: client,
        });

        expect(result.currentVersion).toBe(7);
        expect(result.targetVersion).toBe(8);
        expect(result.finalVersion).toBe(8);
        expect(result.appliedMigrations).toEqual([
            {
                version: 8,
                name: 'add_migration_history',
            }
        ]);
        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('COMMIT');
        expect(client.calls.some((call) => call.text.includes('INSERT INTO migration_history'))).toBe(true);
    });

    it('rolls back failed MySQL setup migrations', async () => {
        const client = createProvider();
        const failingMigrations: AsyncMigrationDefinition[] = [
            {
                version: 8,
                name: 'broken_migration',
                async apply() {
                    throw new Error('forced migration failure');
                }
            }
        ];

        await expect(runMigrationWorkflow({
            pool: client,
            migrations: failingMigrations,
        })).rejects.toThrow('forced migration failure');

        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('ROLLBACK');
        expect(client.calls.map((call) => call.text)).not.toContain('COMMIT');
    });
});
// apply-patch-anchor - do not delete
