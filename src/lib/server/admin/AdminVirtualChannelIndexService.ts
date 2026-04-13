import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { VirtualChannel } from '$lib/entities/virtualChannel';
import type {
    AdminVirtualChannelIndexPageData,
    AdminVirtualChannelInlineMutationData,
    AdminVirtualChannelInlineServiceError,
    AdminVirtualChannelRedirect,
    AdminVirtualChannelRow,
    AdminVirtualChannelServiceError,
    AdminVirtualChannelServiceResult
} from '$lib/server/admin/AdminVirtualChannelTypes';

export interface CreateVirtualChannelInput
{
    name: string;
}

export interface RenameVirtualChannelInput
{
    id: number;
    name: string;
}

export interface DeleteVirtualChannelInput
{
    id: number;
}

export interface AdminInlineAssociationInput
{
    virtualChannelId: number;
    sourceChannelId: number;
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

    loadPageData(): AdminVirtualChannelIndexPageData
    {
        const allSourceChannels = this.sourceChannelDAO.list();
        const groups = this.virtualChannelDAO
            .list()
            .map((virtualChannel) => this.buildVirtualChannelRow(virtualChannel, allSourceChannels));

        return {
            groups,
            availableSourceChannels: allSourceChannels
        };
    }

    createVirtualChannel(input: CreateVirtualChannelInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'create_virtual_channel_failed'>
    >
    {
        try {
            this.virtualChannelDAO.create(input.name);

            return {
                ok: true,
                data: { redirectTo: AdminVirtualChannelIndexService.INDEX_PATH }
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

    renameVirtualChannel(input: RenameVirtualChannelInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'rename_virtual_channel_failed'>
    >
    {
        try {
            this.virtualChannelDAO.rename(input.id, input.name);

            return {
                ok: true,
                data: { redirectTo: AdminVirtualChannelIndexService.INDEX_PATH }
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

    deleteVirtualChannel(input: DeleteVirtualChannelInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'delete_virtual_channel_failed'>
    >
    {
        try {
            this.virtualChannelDAO.remove(input.id);

            return {
                ok: true,
                data: { redirectTo: AdminVirtualChannelIndexService.INDEX_PATH }
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

    addInlineAssociation(input: AdminInlineAssociationInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelInlineMutationData,
        AdminVirtualChannelInlineServiceError<
            'virtual_channel_not_found' |
            'source_channel_not_found' |
            'add_inline_association_failed'
        >
    >
    {
        try {
            const allSourceChannels = this.sourceChannelDAO.list();
            const virtualChannel = this.virtualChannelDAO.get(input.virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    input.virtualChannelId
                );
            }

            if (!this.sourceChannelDAO.get(input.sourceChannelId)) {
                return this.buildInlineError(
                    'source_channel_not_found',
                    404,
                    'Source channel not found.',
                    input.virtualChannelId
                );
            }

            this.assignmentDAO.add(input.sourceChannelId, input.virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels),
                    message: 'Source channel added.',
                    virtualChannelId: input.virtualChannelId
                }
            };
        } catch (error: unknown) {
            return this.buildInlineError(
                'add_inline_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to add source channel.'),
                input.virtualChannelId
            );
        }
    }

    removeInlineAssociation(input: AdminInlineAssociationInput): AdminVirtualChannelServiceResult<
        AdminVirtualChannelInlineMutationData,
        AdminVirtualChannelInlineServiceError<
            'virtual_channel_not_found' |
            'assignment_not_found' |
            'remove_inline_association_failed'
        >
    >
    {
        try {
            const allSourceChannels = this.sourceChannelDAO.list();
            const virtualChannel = this.virtualChannelDAO.get(input.virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    input.virtualChannelId
                );
            }

            const assignment = this.assignmentDAO
                .listForVirtualChannel(input.virtualChannelId)
                .find((candidate) => candidate.source_channel_id === input.sourceChannelId);

            if (!assignment) {
                return this.buildInlineError(
                    'assignment_not_found',
                    404,
                    'Assignment not found.',
                    input.virtualChannelId
                );
            }

            this.assignmentDAO.remove(input.sourceChannelId, input.virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels),
                    message: 'Source channel removed.',
                    virtualChannelId: input.virtualChannelId
                }
            };
        } catch (error: unknown) {
            return this.buildInlineError(
                'remove_inline_association_failed',
                400,
                this.getErrorMessage(error, 'Failed to remove source channel.'),
                input.virtualChannelId
            );
        }
    }

    private buildVirtualChannelRow(
        virtualChannel: Pick<VirtualChannel, 'id' | 'name'>,
        allSourceChannels: ReturnType<SourceChannelDAO['list']>
    ): AdminVirtualChannelRow
    {
        // Shape the current assignments and remaining inline add options for one row.
        const sourceChannelsById = new Map(allSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = this.assignmentDAO.listForVirtualChannel(virtualChannel.id);
        const associatedSourceChannels = assignments.map((assignment) => ({
            assignment,
            sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null
        }));
        const associatedSourceChannelIds = new Set(assignments.map((assignment) => assignment.source_channel_id));
        const availableSourceChannels = allSourceChannels.filter((channel) => !associatedSourceChannelIds.has(channel.id));

        return {
            id: virtualChannel.id,
            name: virtualChannel.name,
            associatedSourceChannels,
            availableSourceChannels
        };
    }

    private buildInlineError<TCode extends string>(
        code: TCode,
        status: number,
        message: string,
        virtualChannelId: number | null
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
