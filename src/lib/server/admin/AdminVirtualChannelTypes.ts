import type { SourceChannelFields } from '$lib/entities/sourceChannel';
import type { VirtualChannelAssignmentFields } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { VirtualChannelFields } from '$lib/entities/virtualChannel';
import type { VideoFields } from '$lib/entities/video';

export type AdminVideoTypeFilter = 'all' | 'long' | 'short' | 'unknown';
export type AdminReviewStateFilter = 'all' | 'not_yet_reviewed';

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
    assignment: VirtualChannelAssignmentFields;
    sourceChannel: SourceChannelFields | null;
}

export interface AdminVirtualChannelRow
{
    id: number;
    name: string;
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
    virtualChannelId: number;
}

export interface AdminVirtualChannelRedirect
{
    redirectTo: string;
}

export interface AdminSelectedOnlyVideoViewModel
{
    video: VideoFields;
    review_state: VirtualChannelAssignmentVideoReviewState;
}

export interface AdminSelectedOnlyCounts
{
    included: number;
    ignored: number;
    not_yet_reviewed: number;
}

export interface AdminAssociatedSourceChannelView
{
    assignment: VirtualChannelAssignmentFields;
    sourceChannel: SourceChannelFields | null;
    automaticVideos: VideoFields[];
    selectedOnlyVideos: AdminSelectedOnlyVideoViewModel[];
    selectedOnlyCounts: AdminSelectedOnlyCounts | null;
    reviewStateFilter: AdminReviewStateFilter;
    regexFilter: string;
    videoTypeFilter: AdminVideoTypeFilter;
}

export interface AdminVirtualChannelManagePageData
{
    virtualChannel: VirtualChannelFields;
    associatedSourceChannels: AdminAssociatedSourceChannelView[];
    availableSourceChannels: SourceChannelFields[];
}
// apply-patch-anchor - do not delete
