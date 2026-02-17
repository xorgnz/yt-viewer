import { getDb } from '$lib/daos/_shared';
import type { Profile } from '$lib/entities/profile';

export const ProfileDAO = {
    upsertByKey(key: string, name: string)
    {
        const db = getDb();
        db.prepare(`INSERT INTO profiles(key, name) VALUES(?,?)
                ON CONFLICT(key) DO UPDATE SET name=excluded.name`).run(key, name);
    },
    getByKey(key: string): Profile | undefined
    {
        const db = getDb();
        return db.prepare('SELECT id, key, name FROM profiles WHERE key = ?').get(key) as Profile | undefined;
    },
    list(): Profile[]
    {
        const db = getDb();
        return db.prepare('SELECT id, key, name FROM profiles ORDER BY id').all() as Profile[];
    }
};
