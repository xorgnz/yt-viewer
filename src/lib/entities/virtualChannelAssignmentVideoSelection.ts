export enum VirtualChannelAssignmentVideoReviewState
{
    Included = 'included',
    Ignored = 'ignored',
    NotYetReviewed = 'not_yet_reviewed'
}

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
    readonly assignmentId: number;
    readonly videoId: number;
    readonly reviewState: VirtualChannelAssignmentVideoReviewState;
    readonly createdAt: number;
    readonly updatedAt: number;

    constructor(data: VirtualChannelAssignmentVideoSelectionFields)
    {
        this.id = data.id;
        this.assignmentId = data.assignment_id;
        this.videoId = data.video_id;
        this.reviewState = data.review_state;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    toFields(): VirtualChannelAssignmentVideoSelectionFields
    {
        return {
            id: this.id,
            assignment_id: this.assignmentId,
            video_id: this.videoId,
            review_state: this.reviewState,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    static validate(value: any): value is VirtualChannelAssignmentVideoSelection
    {
        if (value instanceof VirtualChannelAssignmentVideoSelection) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.assignmentId === 'number' &&
            typeof value.videoId === 'number' &&
            (
                value.reviewState === VirtualChannelAssignmentVideoReviewState.Included ||
                value.reviewState === VirtualChannelAssignmentVideoReviewState.Ignored ||
                value.reviewState === VirtualChannelAssignmentVideoReviewState.NotYetReviewed
            ) &&
            typeof value.createdAt === 'number' &&
            typeof value.updatedAt === 'number'
        );
    }

    with(patch: Update<VirtualChannelAssignmentVideoSelection>): VirtualChannelAssignmentVideoSelection
    {
        return new VirtualChannelAssignmentVideoSelection({
            id: (patch as any).id ?? this.id,
            assignment_id: (patch as any).assignmentId ?? this.assignmentId,
            video_id: (patch as any).videoId ?? this.videoId,
            review_state: (patch as any).reviewState ?? this.reviewState,
            created_at: (patch as any).createdAt ?? this.createdAt,
            updated_at: (patch as any).updatedAt ?? this.updatedAt
        });
    }
}
// apply-patch-anchor - do not delete
