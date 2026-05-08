import { describe, expect, it } from 'vitest';
import { CREATE_TABLE_META } from '../../src/lib/daos/_schema';
import type { MigrationDefinition } from '../../src/lib/daos/migrations/migrationTypes';
import { runCreateDatabaseWorkflow } from '../../scripts/create_database';
import { runMigrationWorkflow } from '../../scripts/migrate_database';
import { MockQueryProvider } from '../helpers/MockQueryProvider';

function createProvider(): MockQueryProvider
{
    return new MockQueryProvider((sql) => {
        if (sql.includes('SELECT value FROM _meta')) {
            return MockQueryProvider.result([{ value: '7' }]);
        }

        return undefined;
    });
}

describe('database setup scripts', () => {
    it('bootstraps the latest database schema', async () => {
        const client = createProvider();

        await runCreateDatabaseWorkflow({
            pool: client,
        });

        expect(client.calls[0].text).toBe('START TRANSACTION');
        expect(client.calls.some((call) => CREATE_TABLE_META.includes(call.text))).toBe(true);
        expect(client.calls.at(-1)?.text).toBe('COMMIT');
    });

    it('runs registered database migrations', async () => {
        const client = createProvider();

        const result = await runMigrationWorkflow({
            pool: client,
        });

        expect(result.currentVersion).toBe(7);
        expect(result.targetVersion).toBe(9);
        expect(result.finalVersion).toBe(9);
        expect(result.appliedMigrations).toEqual([
            {
                version: 8,
                name: 'add_migration_history',
            },
            {
                version: 9,
                name: 'add_virtual_channel_daily_timer_max',
            }
        ]);
        expect(client.calls.map((call) => call.text)).toContain('START TRANSACTION');
        expect(client.calls.map((call) => call.text)).toContain('COMMIT');
        expect(client.calls.some((call) => call.text.includes('INSERT INTO migration_history'))).toBe(true);
    });

    it('rolls back failed MySQL setup migrations', async () => {
        const client = createProvider();
        const failingMigrations: MigrationDefinition[] = [
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
