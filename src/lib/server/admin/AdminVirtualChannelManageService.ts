import type { AssignmentDAO } from '$lib/daos/assignmentDAO';
import type { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { VideoDAO } from '$lib/daos/videoDAO';
import type { VirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import type { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { VirtualChannelAssignmentMode, type VirtualChannelAssignment, type VirtualChannelAssignmentFields } from '$lib/entities/virtualChannelAssignment';
import { VirtualChannelAssignmentVideoReviewState as ReviewState, type VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import type { SourceChannel, SourceChannelFields } from '$lib/entities/sourceChannel';
import { VideoLengthClassification, type VideoFields } from '$lib/entities/video';
import { ErrorResult, type ErrorFields, type ServiceResult } from '$lib/server/Error';
import type { VirtualChannelFields } from '$lib/entities/virtualChannel';
import { AdminReviewStateFilter as ReviewStateFilter, AdminVideoTypeFilter as VideoTypeFilter } from '$lib/admin/AdminVirtualChannelFilters';
import type { AdminReviewStateFilter, AdminVideoTypeFilter } from '$lib/admin/AdminVirtualChannelFilters';

interface AdminSelectedOnlyVideoViewModel
{
    video: VideoFields;
    reviewState: VirtualChannelAssignmentVideoReviewState;
}

interface AdminSelectedOnlyCounts
{
    included: number;
    ignored: number;
    notYetReviewed: number;
}

interface AdminAssociatedSourceChannelView
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

interface AdminVirtualChannelManagePageData
{
    virtualChannel: VirtualChannelFields;
    associatedSourceChannels: AdminAssociatedSourceChannelView[];
    availableSourceChannels: SourceChannelFields[];
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

    async loadPageData(
        virtualChannelId: string | number,
        searchParams: URLSearchParams
    ): Promise<ServiceResult<
        AdminVirtualChannelManagePageData,
        ErrorFields<'virtual_channel_not_found'>
    >>
    {
        const virtualChannel = await this.virtualChannelDAO.get(virtualChannelId);
        if (!virtualChannel) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        // Load imported source channels and existing assignments for the page shell.
        const availableSourceChannels = await this.sourceChannelDAO.list();
        const sourceChannelsById = new Map(availableSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = await this.assignmentDAO.listForVirtualChannel(virtualChannelId);
        const associatedSourceChannels = await Promise.all(assignments.map((assignment) => this.buildAssociatedSourceChannelView(
            assignment,
            sourceChannelsById,
            searchParams
        )));

        return {
            ok: true,
            data: {
                virtualChannel: virtualChannel.toFields(),
                associatedSourceChannels,
                availableSourceChannels: availableSourceChannels.map((channel) => channel.toFields())
            }
        };
    }

    async addAssociation(
        virtualChannelId: string | number,
        sourceChannelId: string | number,
        mode: VirtualChannelAssignmentMode
    ): Promise<ServiceResult<
        string,
        ErrorFields<
            'virtual_channel_not_found' |
            'source_channel_not_found' |
            'add_association_failed'
        >
    >>
    {
        try {
            if (!await this.virtualChannelDAO.get(virtualChannelId)) {
                return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
            }

            if (!await this.sourceChannelDAO.get(sourceChannelId)) {
                return this.buildError('source_channel_not_found', 404, 'Source channel not found.');
            }

            await this.assignmentDAO.add(sourceChannelId, virtualChannelId, mode);
            return {
                ok: true,
                data: this.buildManagePath(virtualChannelId)
            };
        } catch (error: unknown) {
            return this.buildError(
                'add_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to add source channel.')
            );
        }
    }

    async updateAssociationMode(
        virtualChannelId: string | number,
        assignmentId: string | number,
        mode: VirtualChannelAssignmentMode
    ): Promise<ServiceResult<
        string,
        ErrorFields<'assignment_not_found'>
    >>
    {
        const assignment = await this.assignmentDAO.get(assignmentId);
        if (!assignment || assignment.virtualChannelId !== virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        await this.assignmentDAO.updateMode(assignmentId, mode);
        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId)
        };
    }

    async removeAssociation(
        virtualChannelId: string | number,
        assignmentId: string | number
    ): Promise<ServiceResult<
        string,
        ErrorFields<'assignment_not_found'>
    >>
    {
        const assignment = await this.assignmentDAO.get(assignmentId);
        if (!assignment || assignment.virtualChannelId !== virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        await this.assignmentDAO.remove(assignment.sourceChannelId, assignment.virtualChannelId);
        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId)
        };
    }

    async setVideoReviewState(
        virtualChannelId: string | number,
        assignmentId: string | number,
        videoId: string | number,
        reviewState: VirtualChannelAssignmentVideoReviewState
    ): Promise<ServiceResult<
        string,
        ErrorFields<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >>
    {
        const assignment = await this.assignmentDAO.get(assignmentId);
        if (!assignment || assignment.virtualChannelId !== virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly) {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Video review state is only valid for selected-only assignments.'
            );
        }

        const video = await this.videoDAO.get(videoId);
        if (!video || video.channel_id !== assignment.sourceChannelId) {
            return this.buildError('video_not_found', 404, 'Video not found for this assignment.');
        }

        await this.selectionDAO.setReviewState(assignmentId, videoId, reviewState);
        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId)
        };
    }

    async bulkUpdateVideoReviewState(
        virtualChannelId: string | number,
        assignmentId: string | number,
        videoIds: Array<string | number>,
        reviewState: VirtualChannelAssignmentVideoReviewState,
        returnQuery: string
    ): Promise<ServiceResult<
        string,
        ErrorFields<
            'assignment_not_found' |
            'assignment_mode_invalid' |
            'video_not_found'
        >
    >>
    {
        const assignment = await this.assignmentDAO.get(assignmentId);
        if (!assignment || assignment.virtualChannelId !== virtualChannelId) {
            return this.buildError('assignment_not_found', 404, 'Assignment not found.');
        }

        if (assignment.mode !== VirtualChannelAssignmentMode.SelectedOnly) {
            return this.buildError(
                'assignment_mode_invalid',
                400,
                'Bulk review updates are only valid for selected-only assignments.'
            );
        }

        for (const videoId of videoIds) {
            const video = await this.videoDAO.get(videoId);
            if (!video || video.channel_id !== assignment.sourceChannelId) {
                return this.buildError('video_not_found', 404, `Video ${videoId} is not available for this assignment.`);
            }
        }

        for (const videoId of videoIds) {
            await this.selectionDAO.setReviewState(assignmentId, videoId, reviewState);
        }

        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId, returnQuery)
        };
    }

    async updateTimerSettings(
        virtualChannelId: string | number,
        dailyTimerMax: number | null
    ): Promise<ServiceResult<
        string,
        ErrorFields<'virtual_channel_not_found'>
    >>
    {
        if (!await this.virtualChannelDAO.get(virtualChannelId)) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        await this.virtualChannelDAO.updateDailyTimerMax(virtualChannelId, dailyTimerMax);

        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId)
        };
    }

    async grantExtraTimerSeconds(
        virtualChannelId: string | number,
        additionalSeconds: number
    ): Promise<ServiceResult<
        string,
        ErrorFields<'virtual_channel_not_found'>
    >>
    {
        if (!await this.virtualChannelDAO.get(virtualChannelId)) {
            return this.buildError('virtual_channel_not_found', 404, 'Virtual channel not found');
        }

        await this.virtualChannelDAO.incrementExtraTimerSecondsRemaining(virtualChannelId, additionalSeconds);

        return {
            ok: true,
            data: this.buildManagePath(virtualChannelId)
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
                video: video.toFields(),
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
            assignment: assignment.toFields(),
            sourceChannel: sourceChannelsById.get(assignment.sourceChannelId)?.toFields() ?? null,
            automaticVideos: automaticVideos.map((video) => video.toFields()),
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
    ): ServiceResult<never, ErrorFields<TCode>>
    {
        return ErrorResult.error(code, status, message);
    }

    private getErrorMessage(error: unknown, fallback: string): string
    {
        return error instanceof Error ? error.message : fallback;
    }
}
// apply-patch-anchor - do not delete
