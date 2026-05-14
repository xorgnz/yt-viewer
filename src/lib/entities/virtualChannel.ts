export type VirtualChannelFields = {
    id: string | number;
    name: string;
    dailyTimerMax: number | null;
};

export class VirtualChannel
{
    readonly id: string | number;
    readonly name: string;
    readonly dailyTimerMax: number | null;

    constructor(data: VirtualChannelFields) {
        this.id = data.id;
        this.name = data.name;
        this.dailyTimerMax = data.dailyTimerMax;
    }

    toFields(): VirtualChannelFields
    {
        return {
            id: this.id,
            name: this.name,
            dailyTimerMax: this.dailyTimerMax,
        };
    }

    static validate(value: any): value is VirtualChannel {
        if (value instanceof VirtualChannel) return true;
        return (
            value &&
            typeof value === 'object' &&
            (typeof value.id === 'string' || typeof value.id === 'number') &&
            typeof value.name === 'string' &&
            (
                value.dailyTimerMax === undefined
                || value.dailyTimerMax === null
                || typeof value.dailyTimerMax === 'number'
            )
        );
    }

    with(patch: Update<VirtualChannel>): VirtualChannel {
        return new VirtualChannel({
                id: patch.id ?? this.id,
                name: patch.name ?? this.name,
                dailyTimerMax: patch.dailyTimerMax ?? this.dailyTimerMax,
            }
        );
    }
}
// apply-patch-anchor - do not delete
