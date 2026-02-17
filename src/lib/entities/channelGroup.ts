export type ChannelGroupFields = {
    id: number;
    name: string;
};

export class ChannelGroup {
    readonly id: number;
    readonly name: string;

    constructor(data: ChannelGroupFields) {
        this.id = data.id;
        this.name = data.name;
    }

    static validate(value: any): value is ChannelGroup {
        if (value instanceof ChannelGroup) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.name === 'string'
        );
    }

    with(patch: Update<ChannelGroup>): ChannelGroup {
        return new ChannelGroup({
                id: patch.id ?? this.id,
                name: patch.name ?? this.name,
            }
        );
    }
}
