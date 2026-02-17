import { SqliteDAO } from '$lib/daos/_shared';
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
