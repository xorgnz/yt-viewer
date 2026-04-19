export type VirtualChannelAssignmentMode = 'all' | 'long_only' | 'selected_only';

export type VirtualChannelAssignmentFields = {
    id: number;
    source_channel_id: number;
    virtual_channel_id: number;
    mode: VirtualChannelAssignmentMode;
    created_at: number;
    updated_at: number;
};

export class VirtualChannelAssignment
{
    readonly id: number;
    readonly source_channel_id: number;
    readonly virtual_channel_id: number;
    readonly mode: VirtualChannelAssignmentMode;
    readonly created_at: number;
    readonly updated_at: number;

    constructor(data: VirtualChannelAssignmentFields)
    {
        this.id = data.id;
        this.source_channel_id = data.source_channel_id;
        this.virtual_channel_id = data.virtual_channel_id;
        this.mode = data.mode;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static validate(value: any): value is VirtualChannelAssignment
    {
        if (value instanceof VirtualChannelAssignment) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.source_channel_id === 'number' &&
            typeof value.virtual_channel_id === 'number' &&
            (value.mode === 'all' || value.mode === 'long_only' || value.mode === 'selected_only') &&
            typeof value.created_at === 'number' &&
            typeof value.updated_at === 'number'
        );
    }

    with(patch: Update<VirtualChannelAssignment>): VirtualChannelAssignment
    {
        return new VirtualChannelAssignment({
            id: (patch as any).id ?? this.id,
            source_channel_id: (patch as any).source_channel_id ?? this.source_channel_id,
            virtual_channel_id: (patch as any).virtual_channel_id ?? this.virtual_channel_id,
            mode: (patch as any).mode ?? this.mode,
            created_at: (patch as any).created_at ?? this.created_at,
            updated_at: (patch as any).updated_at ?? this.updated_at
        });
    }
}
// apply-patch-anchor - do not delete