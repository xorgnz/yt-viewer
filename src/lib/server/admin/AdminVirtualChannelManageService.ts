import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VideoDAO } from '$lib/daos/videoDAO';
import { VirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { SourceChannel } from '$lib/entities/sourceChannel';
import type {
    AdminAssociatedSourceChannelView,
    AdminReviewStateFilter,
    AdminVideoTypeFilter,
    AdminVirtualChannelManagePageData,
    AdminVirtualChannelRedirect,
    AdminVirtualChannelServiceError,
    AdminVirtualChannelServiceResult
} from '$lib/server/admin/AdminVirtualChannelTypes';

export interface LoadAdminVirtualChannelPageInput
{
    virtualChannelId: number;
    searchParams: URLSearchParams;
}

export interface AddAdminAssociationInput
{
    virtualChannelId: number;
    sourceChannelId: number;
    mode: VirtualChannelAssignmentMode;
}

export interface UpdateAdminAssociationModeInput
{
    virtualChannelId: number;
    assignmentId: number;
    mode: VirtualChannelAssignmentMode;
}

export interface RemoveAdminAssociationInput
{
    virtualChannelId: number;
    assignmentId: number;
}

export interface SetAdminVideoReviewStateInput
{
    virtualChannelId: number;
    assignmentId: number;
    videoId: number;
    reviewState: VirtualChannelAssignmentVideoReviewState;
}

export interface BulkUpdateAdminVideoReviewStateInput
{
    virtualChannelId: number;
    assignmentId: number;
    videoIds: number[];
    reviewState: VirtualChannelAssignmentVideoReviewState;
    returnQuery: string;
}

export class AdminVirtualChannelManageService
{
    private readonly virtualChannelDAO: VirtualChannelDAO;
    private readonly assignmentDAO: AssignmentDAO;
    private readonly sourceChannelDAO: SourceChannelDAO;
    private readonly videoDAO: VideoDAO;
    private readonly selectionDAO: VirtualChannelAssignmentVideoSelectionDAO;

    constructor(
        virtualChannelDAO: VirtualChannelDAO,
        assignmentDAO: AssignmentDAO,
        sourceChannelDAO: SourceChannelDAO,
        videoDAO: VideoDAO,
        selectionDAO: VirtualChannelAssignmentVideoSelectionDAO
    )
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.assignmentDAO = assignmentDAO;
        this.sourceChannelDAO = sourceChannelDAO;
        this.videoDAO = videoDAO;
        this.selectionDAO = selectionDAO;
    }

    loadPageData(input: LoadAdminVirtualChannelPageInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelManagePageData,
        AdminVirtualChannelServiceError<'virtual_channel_not_found'>
    >
    {
        const virtualChannel = this.virtualChannelDAO.get(input.virtualChannelId);
        if (!virtualChannel) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        // Load imported source channels and existing assignments for the page shell.
        const availableSourceChannels = this.sourceChannelDAO.list();
        const sourceChannelsById = new Map(availableSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = this.assignmentDAO.listForVirtualChannel(input.virtualChannelId);
        const associatedSourceChannels = assignments.map((assignment) => this.buildAssociatedSourceChannelView(
            assignment,
            sourceChannelsById,
            input.searchParams
        ));

        return {
            ok: true,
            data: {
                virtualChannel,
                associatedSourceChannels,
                availableSourceChannels
            }
        };
    }

    addAssociation(input: AddAdminAssociationInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'virtual_channel_not_found' |
            'source_channel_not_found' |
            'add_association_failed'
        >
    >
    {
        try {
            if (!this.virtualChannelDAO.get(input.virtualChannelId)) {
                return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
            }

            if (!this.sourceChannelDAO.get(input.sourceChannelId)) {
                return this.buildError('source_channel_not_found', 404, 'Source channel not found.');
            }

            this.assignmentDAO.add(input.sourceChannelId, input.virtualChannelId, input.mode);
            return {
                ok: true,
                data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
            };
        } catch (error: any) {
            return this.buildError(
                'add_association_failed',
                400,
                error?.message || 'Failed to add source channel.'
            );
        }
    }

    updateAssociationMode(input: UpdateAdminAssociationModeInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'assignment_not_found'>
    >
    {
        const assignment = this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtual_channel_id !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        this.assignmentDAO.updateMode(input.assignmentId, input.mode);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    removeAssociation(input: RemoveAdminAssociationInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'assignment_not_found'>
    >
    {
        const assignment = this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtual_channel_id !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        this.assignmentDAO.remove(assignment.source_channel_id, assignment.virtual_channel_id);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    setVideoReviewState(input: SetAdminVideoReviewStateInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >
    {
        const assignment = this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtual_channel_id !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== 'selected_only') {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Video review state is only valid for selected-only assignments.'
            );
        }

        const video = this.videoDAO.get(input.videoId);
        if (!video || video.channel_id !== assignment.source_channel_id) {
            return this.buildError('video_not_found', 404, 'Video not found for this assignment.');
        }

        this.selectionDAO.setReviewState(input.assignmentId, input.videoId, input.reviewState);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    bulkUpdateVideoReviewState(input: BulkUpdateAdminVideoReviewStateInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >
    {
        const assignment = this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtual_channel_id !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== 'selected_only') {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Bulk review updates are only valid for selected-only assignments.'
            );
        }

        for (const videoId of input.videoIds) {
            const video = this.videoDAO.get(videoId);
            if (!video || video.channel_id !== assignment.source_channel_id) {
                return this.buildError('video_not_found', 404, `Video ${videoId} is not available for this assignment.`);
            }
        }

        for (const videoId of input.videoIds) {
            this.selectionDAO.setReviewState(input.assignmentId, videoId, input.reviewState);
        }

        return {
            ok: true,
            data: {
                redirectTo: this.buildManagePath(input.virtualChannelId, input.returnQuery)
            }
        };
    }

    private buildAssociatedSourceChannelView(
        assignment: VirtualChannelAssignment,
        sourceChannelsById: Map<number, SourceChannel>,
        searchParams: URLSearchParams
    ): AdminAssociatedSourceChannelView
    {
        const regexFilter = searchParams.get(`regexFilter-${assignment.id}`)?.trim() ?? '';
        const videoTypeFilter = this.getVideoTypeFilter(searchParams, assignment.id);
        const sourceVideos = this.videoDAO.listByChannel(assignment.source_channel_id);
        const selectionRows = assignment.mode === 'selected_only'
            ? this.selectionDAO.listForAssignment(assignment.id)
            : [];
        const selectionByVideoId = new Map(selectionRows.map((row) => [row.video_id, row]));

        // Split automatic and selected-only display models so the route only renders.
        const automaticVideos = assignment.mode === 'selected_only'
            ? []
            : sourceVideos.filter((video) => {
                if (assignment.mode === 'all') {
                    return true;
                }

                return video.length_classification === 'long';
            });
        const selectedOnlyVideos = assignment.mode !== 'selected_only'
            ? []
            : sourceVideos.map((video) => ({
                ...video,
                review_state: selectionByVideoId.get(video.id)?.review_state ?? 'not_yet_reviewed'
            }));
        const selectedOnlyCounts = assignment.mode !== 'selected_only'
            ? null
            : {
                included: selectedOnlyVideos.filter((video) => video.review_state === 'included').length,
                ignored: selectedOnlyVideos.filter((video) => video.review_state === 'ignored').length,
                not_yet_reviewed: selectedOnlyVideos.filter((video) => video.review_state === 'not_yet_reviewed').length
            };

        return {
            assignment,
            sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null,
            automaticVideos,
            selectedOnlyVideos,
            selectedOnlyCounts,
            reviewStateFilter: this.getReviewStateFilter(searchParams, assignment.id),
            regexFilter,
            videoTypeFilter
        };
    }

    private getReviewStateFilter(searchParams: URLSearchParams, assignmentId: number): AdminReviewStateFilter
    {
        return searchParams.get(`reviewStateFilter-${assignmentId}`) === 'not_yet_reviewed'
            ? 'not_yet_reviewed'
            : 'all';
    }

    private getVideoTypeFilter(searchParams: URLSearchParams, assignmentId: number): AdminVideoTypeFilter
    {
        const value = searchParams.get(`videoTypeFilter-${assignmentId}`);
        return value === 'long' || value === 'short' || value === 'unknown'
            ? value
            : 'all';
    }

    private buildManagePath(virtualChannelId: number, returnQuery?: string): string
    {
        const suffix = returnQuery ? `?${returnQuery}` : '';
        return `/admin/virtual-channels/${virtualChannelId}${suffix}`;
    }

    private buildError<TCode extends string>(
        code: TCode,
        status: number,
        message: string
    ): AdminVirtualChannelServiceResult<never, AdminVirtualChannelServiceError<TCode>>
    {
        return {
            ok: false,
            error: {
                code,
                status,
                message
            }
        };
    }
}
