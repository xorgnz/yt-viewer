import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
import type { Profile } from '$lib/entities/profile';

export class MySqlProfileDAO extends MySqlDAO
{
    async upsertByKey(key: string, name: string): Promise<void>
    {
        await this.run(`
            INSERT INTO profiles(\`key\`, name) VALUES(?,?)
            ON DUPLICATE KEY UPDATE name=VALUES(name)
        `, [key, name]);
    }

    async getByKey(key: string): Promise<Profile | undefined>
    {
        return this.getOne<Profile>(`SELECT id, \`key\`, name FROM profiles WHERE \`key\` = ?`, [key]);
    }

    async list(): Promise<Profile[]>
    {
        return this.listRows<Profile>(`SELECT id, \`key\`, name FROM profiles ORDER BY id`);
    }
}
// apply-patch-anchor - do not delete



