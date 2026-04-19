import { MySqlDAO } from '$lib/daos/shared/MySqlDAO';
import { VirtualChannel } from '$lib/entities/virtualChannel';

export class MySqlVirtualChannelDAO extends MySqlDAO
{
    async create(name: string): Promise<VirtualChannel>
    {
        const id = await this.insert(`INSERT INTO virtual_channels(name) VALUES(?)`, [name]);
        return new VirtualChannel({ id, name });
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
// apply-patch-anchor - do not delete



