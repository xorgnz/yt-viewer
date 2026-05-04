import type { SourceChannel } from '$lib/entities/sourceChannel';
import type { VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { VirtualChannel } from '$lib/entities/virtualChannel';
import type { Video } from '$lib/entities/video';

export enum AdminVideoTypeFilter
{
    All = 'all',
    Long = 'long',
    Short = 'short',
    Unknown = 'unknown'
}

export enum AdminReviewStateFilter
{
    All = 'all',
    NotYetReviewed = 'notYetReviewed'
}

export interface AdminVirtualChannelServiceError<TCode extends string = string>
{
    code: TCode;
    status: number;
    message: string;
}

export interface AdminVirtualChannelInlineServiceError<TCode extends string = string>
    extends AdminVirtualChannelServiceError<TCode>
{
    virtualChannelId: number | null;
}

export type AdminVirtualChannelServiceResult<
    TSuccess,
    TError extends AdminVirtualChannelServiceError = AdminVirtualChannelServiceError
> = {
    ok: true;
    data: TSuccess;
} | {
    ok: false;
    error: TError;
};

export interface AdminInlineAssociation
{
    assignment: VirtualChannelAssignment;
    sourceChannel: SourceChannel | null;
}

export interface AdminVirtualChannelRow
{
    virtualChannel: VirtualChannel;
    associatedSourceChannels: AdminInlineAssociation[];
    availableSourceChannels: SourceChannel[];
}

export interface AdminVirtualChannelIndexPageData
{
    groups: AdminVirtualChannelRow[];
    availableSourceChannels: SourceChannel[];
}

export interface AdminVirtualChannelInlineMutationData
{
    group: AdminVirtualChannelRow;
    message: string;
    virtualChannelId: number;
}

export interface AdminVirtualChannelRedirect
{
    redirectTo: string;
}

export interface AdminSelectedOnlyVideoViewModel
{
    video: Video;
    reviewState: VirtualChannelAssignmentVideoReviewState;
}

export interface AdminSelectedOnlyCounts
{
    included: number;
    ignored: number;
    notYetReviewed: number;
}

export interface AdminAssociatedSourceChannelView
{
    assignment: VirtualChannelAssignment;
    sourceChannel: SourceChannel | null;
    automaticVideos: Video[];
    selectedOnlyVideos: AdminSelectedOnlyVideoViewModel[];
    selectedOnlyCounts: AdminSelectedOnlyCounts | null;
    reviewStateFilter: AdminReviewStateFilter;
    regexFilter: string;
    videoTypeFilter: AdminVideoTypeFilter;
}

export interface AdminVirtualChannelManagePageData
{
    virtualChannel: VirtualChannel;
    associatedSourceChannels: AdminAssociatedSourceChannelView[];
    availableSourceChannels: SourceChannel[];
}
// apply-patch-anchor - do not delete
