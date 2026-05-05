export enum VirtualChannelAssignmentMode
{
    All = 'all',
    LongOnly = 'long_only',
    SelectedOnly = 'selected_only'
}

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
    readonly sourceChannelId: number;
    readonly virtualChannelId: number;
    readonly mode: VirtualChannelAssignmentMode;
    readonly createdAt: number;
    readonly updatedAt: number;

    constructor(data: VirtualChannelAssignmentFields)
    {
        this.id = data.id;
        this.sourceChannelId = data.source_channel_id;
        this.virtualChannelId = data.virtual_channel_id;
        this.mode = data.mode;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    toFields(): VirtualChannelAssignmentFields
    {
        return {
            id: this.id,
            source_channel_id: this.sourceChannelId,
            virtual_channel_id: this.virtualChannelId,
            mode: this.mode,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }

    static validate(value: any): value is VirtualChannelAssignment
    {
        if (value instanceof VirtualChannelAssignment) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.sourceChannelId === 'number' &&
            typeof value.virtualChannelId === 'number' &&
            (
                value.mode === VirtualChannelAssignmentMode.All ||
                value.mode === VirtualChannelAssignmentMode.LongOnly ||
                value.mode === VirtualChannelAssignmentMode.SelectedOnly
            ) &&
            typeof value.createdAt === 'number' &&
            typeof value.updatedAt === 'number'
        );
    }

    with(patch: Update<VirtualChannelAssignment>): VirtualChannelAssignment
    {
        return new VirtualChannelAssignment({
            id: (patch as any).id ?? this.id,
            source_channel_id: (patch as any).sourceChannelId ?? this.sourceChannelId,
            virtual_channel_id: (patch as any).virtualChannelId ?? this.virtualChannelId,
            mode: (patch as any).mode ?? this.mode,
            created_at: (patch as any).createdAt ?? this.createdAt,
            updated_at: (patch as any).updatedAt ?? this.updatedAt
        });
    }
}
// apply-patch-anchor - do not delete
