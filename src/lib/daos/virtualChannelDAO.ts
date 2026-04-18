import { SqliteDAO } from '$lib/daos/shared/SqliteDAO';
import { PostgresDAO } from '$lib/daos/shared/PostgresDAO';
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

export class PostgresVirtualChannelDAO extends PostgresDAO
{
    async create(name: string): Promise<VirtualChannel>
    {
        const row = await this.getOne<{ id: number }>(
            `INSERT INTO virtual_channels(name) VALUES(?) RETURNING id`,
            [name]
        );

        return new VirtualChannel({ id: Number(row?.id), name });
    }

    async get(id: number): Promise<VirtualChannel | undefined>
    {
        return this.getOne<VirtualChannel>(`SELECT * FROM virtual_channels WHERE id = ?`, [id]);
    }

    async rename(id: number, name: string): Promise<void>
    {
        await this.run(`UPDATE virtual_channels SET name = ? WHERE id = ?`, [name, id]);
    }

    async list(): Promise<VirtualChannel[]>
    {
        return this.listRows<VirtualChannel>(`SELECT * FROM virtual_channels ORDER BY name`);
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM virtual_channels WHERE id = ?`, [id]);
    }
}
