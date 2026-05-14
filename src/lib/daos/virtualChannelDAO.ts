import { DAO } from '$lib/daos/shared/DAO';
import { VirtualChannel, type VirtualChannelFields } from '$lib/entities/virtualChannel';
import { randomBytes } from 'node:crypto';

const VCHANNEL_ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789';

function buildRandomVChannelId(): string
{
    const bytes = randomBytes(16);
    let suffix = '';

    for (let index = 0; index < 16; index += 1) {
        suffix += VCHANNEL_ALPHABET[bytes[index] % VCHANNEL_ALPHABET.length];
    }

    return `vc_${suffix}`;
}

export class VirtualChannelDAO extends DAO
{
    private readonly idProvider: () => string;

    constructor(db: ConstructorParameters<typeof DAO>[0], idProvider: () => string = buildRandomVChannelId)
    {
        super(db);
        this.idProvider = idProvider;
    }

    async create(name: string, dailyTimerMax: number | null = null): Promise<VirtualChannel>
    {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const id = this.idProvider();

            try {
                await this.run(
                    `INSERT INTO virtual_channels(vchannel_id, name, daily_timer_max) VALUES(?, ?, ?)`,
                    [id, name, dailyTimerMax]
                );

                return new VirtualChannel({ id, name, dailyTimerMax });
            } catch (error: any) {
                if (error?.code === 'ER_DUP_ENTRY') {
                    continue;
                }

                throw error;
            }
        }

        throw new Error('Failed to generate a unique virtual channel id.');
    }

    async get(id: string | number): Promise<VirtualChannel | undefined>
    {
        const fields = await this.getOne<VirtualChannelFields>(
            `SELECT vchannel_id AS id, name, daily_timer_max AS dailyTimerMax FROM virtual_channels WHERE vchannel_id = ?`,
            [String(id)]
        );

        return fields ? new VirtualChannel(fields) : undefined;
    }

    async rename(id: string | number, name: string): Promise<void>
    {
        await this.run(`UPDATE virtual_channels SET name = ? WHERE vchannel_id = ?`, [name, String(id)]);
    }

    async updateDailyTimerMax(id: string | number, dailyTimerMax: number | null): Promise<void>
    {
        await this.run(
            `UPDATE virtual_channels SET daily_timer_max = ? WHERE vchannel_id = ?`,
            [dailyTimerMax, String(id)]
        );
    }

    async list(): Promise<VirtualChannel[]>
    {
        const rows = await this.listRows<VirtualChannelFields>(
            `SELECT vchannel_id AS id, name, daily_timer_max AS dailyTimerMax FROM virtual_channels ORDER BY name`
        );

        return rows.map((row) => new VirtualChannel(row));
    }

    async remove(id: string | number): Promise<void>
    {
        await this.run(`DELETE FROM virtual_channels WHERE vchannel_id = ?`, [String(id)]);
    }
}
// apply-patch-anchor - do not delete



