import { getDb } from '$lib/daos/_shared';
import type { ChannelGroup } from '$lib/entities/channelGroup';

export const ChannelGroupDAO = {
    create(name: string): ChannelGroup
    {
        const db = getDb();
        const info = db.prepare('INSERT INTO channel_groups(name) VALUES(?)').run(name);
        return { id: Number(info.lastInsertRowid), name };
    },
    rename(id: number, name: string)
    {
        const db = getDb();
        db.prepare('UPDATE channel_groups SET name = ? WHERE id = ?').run(name, id);
    },
    list(): ChannelGroup[]
    {
        const db = getDb();
        return db.prepare('SELECT * FROM channel_groups ORDER BY name').all() as ChannelGroup[];
    },
    remove(id: number)
    {
        const db = getDb();
        db.prepare('DELETE FROM channel_groups WHERE id = ?').run(id);
    }
};
