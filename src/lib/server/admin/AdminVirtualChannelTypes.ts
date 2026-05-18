import type { SourceChannel, SourceChannelFields } from '$lib/entities/sourceChannel';
import type { VirtualChannelAssignment, VirtualChannelAssignmentFields } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { VirtualChannel, VirtualChannelFields } from '$lib/entities/virtualChannel';
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
    virtualChannelId: string | number | null;
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
    assignment: VirtualChannelAssignmentFields;
    sourceChannel: SourceChannelFields | null;
}

export interface AdminVirtualChannelRow
{
    virtualChannel: VirtualChannelFields;
    associatedSourceChannels: AdminInlineAssociation[];
    availableSourceChannels: SourceChannelFields[];
}

export interface AdminVirtualChannelIndexPageData
{
    groups: AdminVirtualChannelRow[];
    availableSourceChannels: SourceChannelFields[];
}

export interface AdminVirtualChannelInlineMutationData
{
    group: AdminVirtualChannelRow;
    message: string;
    virtualChannelId: string | number;
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
