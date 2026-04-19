export type ChannelGroupFields = {
    id: number;
    name: string;
};

export class VirtualChannel
{
    readonly id: number;
    readonly name: string;

    constructor(data: ChannelGroupFields) {
        this.id = data.id;
        this.name = data.name;
    }

    static validate(value: any): value is VirtualChannel {
        if (value instanceof VirtualChannel) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.name === 'string'
        );
    }

    with(patch: Update<VirtualChannel>): VirtualChannel {
        return new VirtualChannel({
                id: patch.id ?? this.id,
                name: patch.name ?? this.name,
            }
        );
    }
}
// apply-patch-anchor - do not delete