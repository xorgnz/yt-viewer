import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { PostgresDAO } from '$lib/daos/shared/PostgresDAO';
import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
import type { Profile } from '$lib/entities/profile';

export class ProfileDAO extends SqliteDAO
{
    upsertByKey(key: string, name: string)
    {
        this.db.prepare(`
            INSERT INTO profiles(key, name) VALUES(?,?)
            ON CONFLICT(key) DO UPDATE SET name=excluded.name
        `).run(key, name);
    }

    getByKey(key: string): Profile | undefined
    {
        return this.db.prepare(`SELECT id, key, name FROM profiles WHERE key = ?`).get(key) as Profile | undefined;
    }

    list(): Profile[]
    {
        return this.db.prepare(`SELECT id, key, name FROM profiles ORDER BY id`).all() as Profile[];
    }
}

export class PostgresProfileDAO extends PostgresDAO
{
    async upsertByKey(key: string, name: string): Promise<void>
    {
        await this.run(`
            INSERT INTO profiles(key, name) VALUES(?,?)
            ON CONFLICT(key) DO UPDATE SET name=excluded.name
        `, [key, name]);
    }

    async getByKey(key: string): Promise<Profile | undefined>
    {
        return this.getOne<Profile>(`SELECT id, key, name FROM profiles WHERE key = ?`, [key]);
    }

    async list(): Promise<Profile[]>
    {
        return this.listRows<Profile>(`SELECT id, key, name FROM profiles ORDER BY id`);
    }
}

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
