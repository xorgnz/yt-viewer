import type { AssignmentDAO } from '$lib/daos/assignmentDAO';
import type { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { SourceChannel, SourceChannelFields } from '$lib/entities/sourceChannel';
import type { VirtualChannel } from '$lib/entities/virtualChannel';
import type { VirtualChannelAssignmentFields } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelFields } from '$lib/entities/virtualChannel';

type AdminAssignmentRows = Awaited<ReturnType<AssignmentDAO['listForVirtualChannel']>>;

interface AdminVirtualChannelServiceError<TCode extends string = string>
{
    code: TCode;
    status: number;
    message: string;
}

interface AdminVirtualChannelInlineServiceError<TCode extends string = string>
    extends AdminVirtualChannelServiceError<TCode>
{
    virtualChannelId: string | number | null;
}

type AdminVirtualChannelServiceResult<
    TSuccess,
    TError extends AdminVirtualChannelServiceError = AdminVirtualChannelServiceError
> = {
    ok: true;
    data: TSuccess;
} | {
    ok: false;
    error: TError;
};

interface AdminInlineAssociation
{
    assignment: VirtualChannelAssignmentFields;
    sourceChannel: SourceChannelFields | null;
}

interface AdminVirtualChannelRow
{
    virtualChannel: VirtualChannelFields;
    associatedSourceChannels: AdminInlineAssociation[];
    availableSourceChannels: SourceChannelFields[];
}

interface AdminVirtualChannelIndexPageData
{
    groups: AdminVirtualChannelRow[];
    availableSourceChannels: SourceChannelFields[];
}

interface AdminVirtualChannelInlineMutationData
{
    group: AdminVirtualChannelRow;
    message: string;
    virtualChannelId: string | number;
}

export class AdminVirtualChannelIndexService
{
    private static readonly INDEX_PATH = '/admin/virtual-channels';

    private readonly virtualChannelDAO: VirtualChannelDAO;
    private readonly assignmentDAO: AssignmentDAO;
    private readonly sourceChannelDAO: SourceChannelDAO;

    constructor(
        virtualChannelDAO: VirtualChannelDAO,
        assignmentDAO: AssignmentDAO,
        sourceChannelDAO: SourceChannelDAO
    )
    {
        this.virtualChannelDAO = virtualChannelDAO;
        this.assignmentDAO = assignmentDAO;
        this.sourceChannelDAO = sourceChannelDAO;
    }

    async loadPageData(): Promise<AdminVirtualChannelIndexPageData>
    {
        const allSourceChannels = await this.sourceChannelDAO.list();
        const virtualChannels = await this.virtualChannelDAO.list();
        const groups = await Promise.all(virtualChannels.map(async (virtualChannel) => {
            const assignments = await this.assignmentDAO.listForVirtualChannel(virtualChannel.id);
            return this.buildVirtualChannelRow(virtualChannel, allSourceChannels, assignments);
        }));

        return {
            groups,
            availableSourceChannels: allSourceChannels.map((channel) => channel.toFields())
        };
    }

    async createVirtualChannel(name: string): Promise<AdminVirtualChannelServiceResult<
        string,
        AdminVirtualChannelServiceError<'create_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.create(name);

            return {
                ok: true,
                data: AdminVirtualChannelIndexService.INDEX_PATH
            };
        } catch (error: unknown) {
            return {
                ok: false,
                error: {
                    code: 'create_virtual_channel_failed',
                    status: 400,
                    message: this.getErrorMessage(error, 'Failed to create group')
                }
            };
        }
    }

    async renameVirtualChannel(id: string | number, name: string): Promise<AdminVirtualChannelServiceResult<
        string,
        AdminVirtualChannelServiceError<'rename_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.rename(id, name);

            return {
                ok: true,
                data: AdminVirtualChannelIndexService.INDEX_PATH
            };
        } catch (error: unknown) {
            return {
                ok: false,
                error: {
                    code: 'rename_virtual_channel_failed',
                    status: 400,
                    message: this.getErrorMessage(error, 'Failed to rename group')
                }
            };
        }
    }

    async deleteVirtualChannel(id: string | number): Promise<AdminVirtualChannelServiceResult<
        string,
        AdminVirtualChannelServiceError<'delete_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.remove(id);

            return {
                ok: true,
                data: AdminVirtualChannelIndexService.INDEX_PATH
            };
        } catch (error: unknown) {
            return {
                ok: false,
                error: {
                    code: 'delete_virtual_channel_failed',
                    status: 400,
                    message: this.getErrorMessage(error, 'Failed to delete group')
                }
            };
        }
    }

    async addInlineAssociation(
        virtualChannelId: string | number,
        sourceChannelId: string | number
    ): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelInlineMutationData,
        AdminVirtualChannelInlineServiceError<
            'virtual_channel_not_found' |
            'source_channel_not_found' |
            'add_inline_association_failed'
        >
    >>
    {
        try {
            const allSourceChannels = await this.sourceChannelDAO.list();
            const virtualChannel = await this.virtualChannelDAO.get(virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    virtualChannelId
                );
            }

            if (!await this.sourceChannelDAO.get(sourceChannelId)) {
                return this.buildInlineError(
                    'source_channel_not_found',
                    404,
                    'Source channel not found.',
                    virtualChannelId
                );
            }

            await this.assignmentDAO.add(sourceChannelId, virtualChannelId);
            const assignments = await this.assignmentDAO.listForVirtualChannel(virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels, assignments),
                    message: 'Source channel added.',
                    virtualChannelId
                }
            };
        } catch (error: unknown) {
            return this.buildInlineError(
                'add_inline_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to add source channel.'),
                virtualChannelId
            );
        }
    }

    async removeInlineAssociation(
        virtualChannelId: string | number,
        sourceChannelId: string | number
    ): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelInlineMutationData,
        AdminVirtualChannelInlineServiceError<
            'virtual_channel_not_found' |
            'assignment_not_found' |
            'remove_inline_association_failed'
        >
    >>
    {
        try {
            const allSourceChannels = await this.sourceChannelDAO.list();
            const virtualChannel = await this.virtualChannelDAO.get(virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    virtualChannelId
                );
            }

            const currentAssignments = await this.assignmentDAO.listForVirtualChannel(virtualChannelId);
            const assignment = currentAssignments
                .find((candidate) => candidate.sourceChannelId === sourceChannelId);

            if (!assignment) {
                return this.buildInlineError(
                    'assignment_not_found',
                    404,
                    'Assignment not found.',
                    virtualChannelId
                );
            }

            await this.assignmentDAO.remove(sourceChannelId, virtualChannelId);
            const assignments = await this.assignmentDAO.listForVirtualChannel(virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels, assignments),
                    message: 'Source channel removed.',
                    virtualChannelId
                }
            };
        } catch (error: unknown) {
            return this.buildInlineError(
                'remove_inline_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to remove source channel.'),
                virtualChannelId
            );
        }
    }

    private buildVirtualChannelRow(
        virtualChannel: VirtualChannel,
        allSourceChannels: SourceChannel[],
        assignments: AdminAssignmentRows
    ): AdminVirtualChannelRow
    {
        // Shape the current assignments and remaining inline add options for one row.
        const sourceChannelsById = new Map(allSourceChannels.map((channel) => [channel.id, channel]));
        const associatedSourceChannels = assignments.map((assignment) => ({
            assignment,
            sourceChannel: sourceChannelsById.get(assignment.sourceChannelId) ?? null
        }));
        const associatedSourceChannelIds = new Set(assignments.map((assignment) => assignment.sourceChannelId));
        const availableSourceChannels = allSourceChannels.filter((channel) => !associatedSourceChannelIds.has(channel.id));

        return {
            virtualChannel: virtualChannel.toFields(),
            associatedSourceChannels: associatedSourceChannels.map((item) => ({
                assignment: item.assignment.toFields(),
                sourceChannel: item.sourceChannel ? item.sourceChannel.toFields() : null
            })),
            availableSourceChannels: availableSourceChannels.map((channel) => channel.toFields())
        };
    }

    private buildInlineError<TCode extends string>(
        code: TCode,
        status: number,
        message: string,
        virtualChannelId: string | number | null
    ): AdminVirtualChannelServiceResult<never, AdminVirtualChannelInlineServiceError<TCode>>
    {
        return {
            ok: false,
            error: {
                code,
                status,
                message,
                virtualChannelId
            }
        };
    }

    private getErrorMessage(error: unknown, fallback: string): string
    {
        return error instanceof Error ? error.message : fallback;
    }
}
// apply-patch-anchor - do not delete
