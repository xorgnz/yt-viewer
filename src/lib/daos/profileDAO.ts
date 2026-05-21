import { DAO } from '$lib/daos/shared/DAO';
import { Profile } from '$lib/entities/profile';

export class ProfileDAO extends DAO
{
    async upsertByKey(key: string, name: string): Promise<void>
    {
        await this.run(`
            INSERT INTO profiles(profile_id, name) VALUES(?,?)
            ON DUPLICATE KEY UPDATE name=VALUES(name)
        `, [key, name]);
    }

    async getByKey(key: string): Promise<Profile | undefined>
    {
        const row = await this.getOne<{
            id: string | number;
            key: string;
            name: string;
            splitTimerModeEnabled: number;
        }>(
            `SELECT profile_id AS id, profile_id AS \`key\`, name, split_timer_mode_enabled AS splitTimerModeEnabled FROM profiles WHERE profile_id = ?`,
            [key]
        );

        return row ? new Profile({
            id: row.id,
            key: row.key,
            name: row.name,
            splitTimerModeEnabled: !!row.splitTimerModeEnabled
        }) : undefined;
    }

    async list(): Promise<Profile[]>
    {
        const rows = await this.listRows<{
            id: string | number;
            key: string;
            name: string;
            splitTimerModeEnabled: number;
        }>(
            `SELECT profile_id AS id, profile_id AS \`key\`, name, split_timer_mode_enabled AS splitTimerModeEnabled FROM profiles ORDER BY profile_id`
        );

        return rows.map((row) => new Profile({
            id: row.id,
            key: row.key,
            name: row.name,
            splitTimerModeEnabled: !!row.splitTimerModeEnabled
        }));
    }

    async updateSplitTimerModeEnabled(key: string, splitTimerModeEnabled: boolean): Promise<void>
    {
        await this.run(
            `UPDATE profiles SET split_timer_mode_enabled = ? WHERE profile_id = ?`,
            [splitTimerModeEnabled ? 1 : 0, key]
        );
    }
}
// apply-patch-anchor - do not delete



