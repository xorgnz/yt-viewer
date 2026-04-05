export type VirtualChannelAssignmentVideoReviewState = 'included' | 'ignored' | 'not_yet_reviewed';

export type VirtualChannelAssignmentVideoSelectionFields = {
    id: number;
    assignment_id: number;
    video_id: number;
    review_state: VirtualChannelAssignmentVideoReviewState;
    created_at: number;
    updated_at: number;
};

export class VirtualChannelAssignmentVideoSelection
{
    readonly id: number;
    readonly assignment_id: number;
    readonly video_id: number;
    readonly review_state: VirtualChannelAssignmentVideoReviewState;
    readonly created_at: number;
    readonly updated_at: number;

    constructor(data: VirtualChannelAssignmentVideoSelectionFields)
    {
        this.id = data.id;
        this.assignment_id = data.assignment_id;
        this.video_id = data.video_id;
        this.review_state = data.review_state;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static validate(value: any): value is VirtualChannelAssignmentVideoSelection
    {
        if (value instanceof VirtualChannelAssignmentVideoSelection) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.assignment_id === 'number' &&
            typeof value.video_id === 'number' &&
            (
                value.review_state === 'included' ||
                value.review_state === 'ignored' ||
                value.review_state === 'not_yet_reviewed'
            ) &&
            typeof value.created_at === 'number' &&
            typeof value.updated_at === 'number'
        );
    }

    with(patch: Update<VirtualChannelAssignmentVideoSelection>): VirtualChannelAssignmentVideoSelection
    {
        return new VirtualChannelAssignmentVideoSelection({
            id: (patch as any).id ?? this.id,
            assignment_id: (patch as any).assignment_id ?? this.assignment_id,
            video_id: (patch as any).video_id ?? this.video_id,
            review_state: (patch as any).review_state ?? this.review_state,
            created_at: (patch as any).created_at ?? this.created_at,
            updated_at: (patch as any).updated_at ?? this.updated_at
        });
    }
}
