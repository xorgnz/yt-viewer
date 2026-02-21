export type VirtualChannelAssignmentFields = {
    source_channel_id: number;
    virtual_channel_id: number;
};

export class VirtualChannelAssignment
{
    readonly source_channel_id: number;
    readonly virtual_channel_id: number;

    constructor(data: VirtualChannelAssignmentFields)
    {
        this.source_channel_id = data.source_channel_id;
        this.virtual_channel_id = data.virtual_channel_id;
    }

    static validate(value: any): value is VirtualChannelAssignment
    {
        if (value instanceof VirtualChannelAssignment) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.source_channel_id === 'number' &&
            typeof value.virtual_channel_id === 'number'
        );
    }

    with(patch: Update<VirtualChannelAssignment>): VirtualChannelAssignment
    {
        return new VirtualChannelAssignment({
            source_channel_id: (patch as any).source_channel_id ?? this.source_channel_id,
            virtual_channel_id: (patch as any).virtual_channel_id ?? this.virtual_channel_id
        });
    }
}
