import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { VirtualChannel } from '$lib/entities/virtualChannel';

export class VirtualChannelDAO extends SqliteDAO
{
    create(name: string): VirtualChannel
    {
        const info = this.db.prepare(`INSERT INTO virtual_channels(name) VALUES(?)`).run(name);
        return new VirtualChannel({ id: Number(info.lastInsertRowid), name });
    }

    get(id: number): VirtualChannel | undefined
    {
        return this.db.prepare(`SELECT * FROM virtual_channels WHERE id = ?`).get(id) as VirtualChannel | undefined;
    }

    rename(id: number, name: string)
    {
        this.db.prepare(`UPDATE virtual_channels SET name = ? WHERE id = ?`).run(name, id);
    }

    list(): VirtualChannel[]
    {
        return this.db.prepare(`SELECT * FROM virtual_channels ORDER BY name`).all() as VirtualChannel[];
    }

    remove(id: number)
    {
        this.db.prepare(`DELETE FROM virtual_channels WHERE id = ?`).run(id);
    }
}
