import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { ChannelGroup } from '$lib/entities/channelGroup';

export class ChannelGroupDAO extends SqliteDAO
{
    create(name: string): ChannelGroup
    {
        const info = this.db.prepare(`INSERT INTO channel_groups(name) VALUES(?)`).run(name);
        return new ChannelGroup({ id: Number(info.lastInsertRowid), name });
    }

    rename(id: number, name: string)
    {
        this.db.prepare(`UPDATE channel_groups SET name = ? WHERE id = ?`).run(name, id);
    }

    list(): ChannelGroup[]
    {
        return this.db.prepare(`SELECT * FROM channel_groups ORDER BY name`).all() as ChannelGroup[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM channel_groups WHERE id = ?`).run(id);
    }
}
