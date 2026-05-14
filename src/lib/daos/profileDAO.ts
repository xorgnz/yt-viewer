import { DAO } from '$lib/daos/shared/DAO';
import type { Profile } from '$lib/entities/profile';

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
        return this.getOne<Profile>(`SELECT profile_id AS id, profile_id AS \`key\`, name FROM profiles WHERE profile_id = ?`, [key]);
    }

    async list(): Promise<Profile[]>
    {
        return this.listRows<Profile>(`SELECT profile_id AS id, profile_id AS \`key\`, name FROM profiles ORDER BY profile_id`);
    }
}
// apply-patch-anchor - do not delete



