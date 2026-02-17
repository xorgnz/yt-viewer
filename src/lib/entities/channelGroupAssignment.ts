export type ChannelGroupAssignmentFields = {
    channel_id: number;
    group_id: number;
};

export class ChannelGroupAssignment
{
    readonly channel_id: number;
    readonly group_id: number;

    constructor(data: ChannelGroupAssignmentFields)
    {
        this.channel_id = data.channel_id;
        this.group_id = data.group_id;
    }

    static validate(value: any): value is ChannelGroupAssignment
    {
        if (value instanceof ChannelGroupAssignment) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.channel_id === 'number' &&
            typeof value.group_id === 'number'
        );
    }

    with(patch: Update<ChannelGroupAssignment>): ChannelGroupAssignment
    {
        return new ChannelGroupAssignment({
            channel_id: (patch as any).channel_id ?? this.channel_id,
            group_id: (patch as any).group_id ?? this.group_id
        });
    }
}
