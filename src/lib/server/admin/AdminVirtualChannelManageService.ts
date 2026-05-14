import type { AssignmentDAO } from '$lib/daos/assignmentDAO';
import type { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { VideoDAO } from '$lib/daos/videoDAO';
import type { VirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import type { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { VirtualChannelAssignmentMode, type VirtualChannelAssignment } from '$lib/entities/virtualChannelAssignment';
import { VirtualChannelAssignmentVideoReviewState as ReviewState, type VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { SourceChannel } from '$lib/entities/sourceChannel';
import { VideoLengthClassification } from '$lib/entities/video';
import { AdminReviewStateFilter as ReviewStateFilter, AdminVideoTypeFilter as VideoTypeFilter, type AdminAssociatedSourceChannelView, type AdminReviewStateFilter, type AdminVideoTypeFilter, type AdminVirtualChannelManagePageData, type AdminVirtualChannelRedirect, type AdminVirtualChannelServiceError, type AdminVirtualChannelServiceResult } from '$lib/server/admin/AdminVirtualChannelTypes';

type AdminVirtualChannelDAO = Pick<VirtualChannelDAO, 'get' | 'updateDailyTimerMax'>;
type AdminAssignmentDAO = Pick<AssignmentDAO, 'add' | 'get' | 'listForVirtualChannel' | 'remove' | 'updateMode'>;
type AdminSourceChannelDAO = Pick<SourceChannelDAO, 'get' | 'list'>;
type AdminVideoDAO = Pick<VideoDAO, 'get' | 'listByChannel'>;
type AdminSelectionDAO = Pick<
    VirtualChannelAssignmentVideoSelectionDAO,
    'listForAssignment' | 'setReviewState'
>;

export interface LoadAdminVirtualChannelPageInput
{
    virtualChannelId: string | number;
    searchParams: URLSearchParams;
}

export interface AddAdminAssociationInput
{
    virtualChannelId: string | number;
    sourceChannelId: string | number;
    mode: VirtualChannelAssignmentMode;
}

export interface UpdateAdminAssociationModeInput
{
    virtualChannelId: string | number;
    assignmentId: string | number;
    mode: VirtualChannelAssignmentMode;
}

export interface RemoveAdminAssociationInput
{
    virtualChannelId: string | number;
    assignmentId: string | number;
}

export interface SetAdminVideoReviewStateInput
{
    virtualChannelId: string | number;
    assignmentId: string | number;
    videoId: string | number;
    reviewState: VirtualChannelAssignmentVideoReviewState;
}

export interface BulkUpdateAdminVideoReviewStateInput
{
    virtualChannelId: string | number;
    assignmentId: string | number;
    videoIds: Array<string | number>;
    reviewState: VirtualChannelAssignmentVideoReviewState;
    returnQuery: string;
}

export interface UpdateAdminVirtualChannelTimerInput
{
    virtualChannelId: string | number;
    dailyTimerMax: number | null;
}

export class AdminVirtualChannelManageService
{
    private readonly virtualChannelDAO: AdminVirtualChannelDAO;
    private readonly assignmentDAO: AdminAssignmentDAO;
    private readonly sourceChannelDAO: AdminSourceChannelDAO;
    private readonly videoDAO: AdminVideoDAO;
    private readonly selectionDAO: AdminSelectionDAO;

    constructor(
        virtualChannelDAO: AdminVirtualChannelDAO,
        assignmentDAO: AdminAssignmentDAO,
        sourceChannelDAO: AdminSourceChannelDAO,
        videoDAO: AdminVideoDAO,
        selectionDAO: AdminSelectionDAO
    )
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.assignmentDAO = assignmentDAO;
        this.sourceChannelDAO = sourceChannelDAO;
        this.videoDAO = videoDAO;
        this.selectionDAO = selectionDAO;
    }

    async loadPageData(input: LoadAdminVirtualChannelPageInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelManagePageData,
        AdminVirtualChannelServiceError<'virtual_channel_not_found'>
    >>
    {
        const virtualChannel = await this.virtualChannelDAO.get(input.virtualChannelId);
        if (!virtualChannel) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        // Load imported source channels and existing assignments for the page shell.
        const availableSourceChannels = await this.sourceChannelDAO.list();
        const sourceChannelsById = new Map(availableSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = await this.assignmentDAO.listForVirtualChannel(input.virtualChannelId);
        const associatedSourceChannels = await Promise.all(assignments.map((assignment) => this.buildAssociatedSourceChannelView(
            assignment,
            sourceChannelsById,
            input.searchParams
        )));

        return {
            ok: true,
            data: {
                virtualChannel,
                associatedSourceChannels,
                availableSourceChannels
            }
        };
    }

    async addAssociation(input: AddAdminAssociationInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'virtual_channel_not_found' |
            'source_channel_not_found' |
            'add_association_failed'
        >
    >>
    {
        try {
            if (!await this.virtualChannelDAO.get(input.virtualChannelId)) {
                return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
            }

            if (!await this.sourceChannelDAO.get(input.sourceChannelId)) {
                return this.buildError('source_channel_not_found', 404, 'Source channel not found.');
            }

            await this.assignmentDAO.add(input.sourceChannelId, input.virtualChannelId, input.mode);
            return {
                ok: true,
                data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
            };
        } catch (error: unknown) {
            return this.buildError(
                'add_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to add source channel.')
            );
        }
    }

    async updateAssociationMode(input: UpdateAdminAssociationModeInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'assignment_not_found'>
    >>
    {
        const assignment = await this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtualChannelId !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        await this.assignmentDAO.updateMode(input.assignmentId, input.mode);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    async removeAssociation(input: RemoveAdminAssociationInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'assignment_not_found'>
    >>
    {
        const assignment = await this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtualChannelId !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        await this.assignmentDAO.remove(assignment.sourceChannelId, assignment.virtualChannelId);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    async setVideoReviewState(input: SetAdminVideoReviewStateInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >>
    {
        const assignment = await this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtualChannelId !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly) {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Video review state is only valid for selected-only assignments.'
            );
        }

        const video = await this.videoDAO.get(input.videoId);
        if (!video || video.channel_id !== assignment.sourceChannelId) {
            return this.buildError('video_not_found', 404, 'Video not found for this assignment.');
        }

        await this.selectionDAO.setReviewState(input.assignmentId, input.videoId, input.reviewState);
        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    async bulkUpdateVideoReviewState(input: BulkUpdateAdminVideoReviewStateInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >>
    {
        const assignment = await this.assignmentDAO.get(input.assignmentId);
        if (!assignment || assignment.virtualChannelId !== input.virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly) {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Bulk review updates are only valid for selected-only assignments.'
            );
        }

        for (const videoId of input.videoIds) {
            const video = await this.videoDAO.get(videoId);
            if (!video || video.channel_id !== assignment.sourceChannelId) {
                return this.buildError('video_not_found', 404, `Video ${videoId} is not available for this assignment.`);
            }
        }

        for (const videoId of input.videoIds) {
            await this.selectionDAO.setReviewState(input.assignmentId, videoId, input.reviewState);
        }

        return {
            ok: true,
            data: {
                redirectTo: this.buildManagePath(input.virtualChannelId, input.returnQuery)
            }
        };
    }

    async updateTimerSettings(input: UpdateAdminVirtualChannelTimerInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'virtual_channel_not_found'>
    >>
    {
        if (!await this.virtualChannelDAO.get(input.virtualChannelId)) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        await this.virtualChannelDAO.updateDailyTimerMax(input.virtualChannelId, input.dailyTimerMax);

        return {
            ok: true,
            data: { redirectTo: this.buildManagePath(input.virtualChannelId) }
        };
    }

    private async buildAssociatedSourceChannelView(
        assignment: VirtualChannelAssignment,
        sourceChannelsById: Map<string | number, SourceChannel>,
        searchParams: URLSearchParams
    ): Promise<AdminAssociatedSourceChannelView>
    {
        const regexFilter = searchParams.get(`regexFilter-${assignment.id}`)?.trim() ?? '';
        const videoTypeFilter = this.getVideoTypeFilter(searchParams, assignment.id);
        const sourceVideos = await this.videoDAO.listByChannel(assignment.sourceChannelId);
        const selectionRows = assignment.mode === VirtualChannelAssignmentMode.SelectedOnly
            ? await this.selectionDAO.listForAssignment(assignment.id)
            : [];
        const selectionByVideoId = new Map(selectionRows.map((row) => [String(row.videoId), row]));

        // Split automatic and selected-only display models so the route only renders.
        const automaticVideos = assignment.mode === VirtualChannelAssignmentMode.SelectedOnly
            ? []
            : sourceVideos.filter((video) => {
                if (assignment.mode === VirtualChannelAssignmentMode.All) {
                    return true;
                }

                return video.length_classification === VideoLengthClassification.Long;
            });
        const selectedOnlyVideos = assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly
            ? []
            : sourceVideos.map((video) => ({
                video,
                reviewState: selectionByVideoId.get(String(video.id))?.reviewState ?? ReviewState.NotYetReviewed
            }));
        const selectedOnlyCounts = assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly
            ? null
            : {
                included: selectedOnlyVideos.filter((video) => video.reviewState === ReviewState.Included).length,
                ignored: selectedOnlyVideos.filter((video) => video.reviewState === ReviewState.Ignored).length,
                notYetReviewed: selectedOnlyVideos.filter((video) => video.reviewState === ReviewState.NotYetReviewed).length
            };

        return {
            assignment,
            sourceChannel: sourceChannelsById.get(assignment.sourceChannelId) ?? null,
            automaticVideos,
            selectedOnlyVideos,
            selectedOnlyCounts,
            reviewStateFilter: this.getReviewStateFilter(searchParams, assignment.id),
            regexFilter,
            videoTypeFilter
        };
    }

    private getReviewStateFilter(searchParams: URLSearchParams, assignmentId: string | number): AdminReviewStateFilter
    {
        return searchParams.get(`reviewStateFilter-${assignmentId}`) === ReviewStateFilter.NotYetReviewed
            ? ReviewStateFilter.NotYetReviewed
            : ReviewStateFilter.All;
    }

    private getVideoTypeFilter(searchParams: URLSearchParams, assignmentId: string | number): AdminVideoTypeFilter
    {
        const value = searchParams.get(`videoTypeFilter-${assignmentId}`);
        return value === VideoTypeFilter.Long || value === VideoTypeFilter.Short || value === VideoTypeFilter.Unknown
            ? value
            : VideoTypeFilter.All;
    }

    private buildManagePath(virtualChannelId: string | number, returnQuery?: string): string
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

    private getErrorMessage(error: unknown, fallback: string): string
    {
        return error instanceof Error ? error.message : fallback;
    }
}
// apply-patch-anchor - do not delete
