import { DAO } from '$lib/daos/shared/DAO';
import { VirtualChannel, type VirtualChannelFields } from '$lib/entities/virtualChannel';

export class VirtualChannelDAO extends DAO
{
    async create(name: string, dailyTimerMax: number | null = null): Promise<VirtualChannel>
    {
        const id = await this.insert(
            `INSERT INTO virtual_channels(name, daily_timer_max) VALUES(?, ?)`,
            [name, dailyTimerMax]
        );

        return new VirtualChannel({ id, name, dailyTimerMax });
    }

    async get(id: number): Promise<VirtualChannel | undefined>
    {
        const fields = await this.getOne<VirtualChannelFields>(
            `SELECT id, name, daily_timer_max AS dailyTimerMax FROM virtual_channels WHERE id = ?`,
            [id]
        );

        return fields ? new VirtualChannel(fields) : undefined;
    }

    async rename(id: number, name: string): Promise<void>
    {
        await this.run(`UPDATE virtual_channels SET name = ? WHERE id = ?`, [name, id]);
    }

    async updateDailyTimerMax(id: number, dailyTimerMax: number | null): Promise<void>
    {
        await this.run(
            `UPDATE virtual_channels SET daily_timer_max = ? WHERE id = ?`,
            [dailyTimerMax, id]
        );
    }

    async list(): Promise<VirtualChannel[]>
    {
        const rows = await this.listRows<VirtualChannelFields>(
            `SELECT id, name, daily_timer_max AS dailyTimerMax FROM virtual_channels ORDER BY name`
        );

        return rows.map((row) => new VirtualChannel(row));
    }

    async remove(id: number): Promise<void>
    {
        await this.run(`DELETE FROM virtual_channels WHERE id = ?`, [id]);
    }
}
// apply-patch-anchor - do not delete



