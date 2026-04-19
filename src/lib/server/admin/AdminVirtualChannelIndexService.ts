import type { AssignmentDAO, MySqlAssignmentDAO } from '$lib/daos/assignmentDAO';
import type { MySqlSourceChannelDAO, SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { MySqlVirtualChannelDAO, VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import type { SourceChannel } from '$lib/entities/sourceChannel';
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

type AdminVirtualChannelDAO = Pick<MySqlVirtualChannelDAO | VirtualChannelDAO, 'create' | 'get' | 'list' | 'remove' | 'rename'>;
type AdminAssignmentDAO = Pick<MySqlAssignmentDAO | AssignmentDAO, 'add' | 'listForVirtualChannel' | 'remove'>;
type AdminSourceChannelDAO = Pick<MySqlSourceChannelDAO | SourceChannelDAO, 'get' | 'list'>;
type AdminAssignmentRows = Awaited<ReturnType<AdminAssignmentDAO['listForVirtualChannel']>>;

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

    private readonly virtualChannelDAO: AdminVirtualChannelDAO;
    private readonly assignmentDAO: AdminAssignmentDAO;
    private readonly sourceChannelDAO: AdminSourceChannelDAO;

    constructor(
        virtualChannelDAO: AdminVirtualChannelDAO,
        assignmentDAO: AdminAssignmentDAO,
        sourceChannelDAO: AdminSourceChannelDAO
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
            availableSourceChannels: allSourceChannels
        };
    }

    async createVirtualChannel(input: CreateVirtualChannelInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'create_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.create(input.name);

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

    async renameVirtualChannel(input: RenameVirtualChannelInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'rename_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.rename(input.id, input.name);

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

    async deleteVirtualChannel(input: DeleteVirtualChannelInput): Promise<AdminVirtualChannelServiceResult<
        AdminVirtualChannelRedirect,
        AdminVirtualChannelServiceError<'delete_virtual_channel_failed'>
    >>
    {
        try {
            await this.virtualChannelDAO.remove(input.id);

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

    async addInlineAssociation(input: AdminInlineAssociationInput): Promise<AdminVirtualChannelServiceResult<
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
            const virtualChannel = await this.virtualChannelDAO.get(input.virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    input.virtualChannelId
                );
            }

            if (!await this.sourceChannelDAO.get(input.sourceChannelId)) {
                return this.buildInlineError(
                    'source_channel_not_found',
                    404,
                    'Source channel not found.',
                    input.virtualChannelId
                );
            }

            await this.assignmentDAO.add(input.sourceChannelId, input.virtualChannelId);
            const assignments = await this.assignmentDAO.listForVirtualChannel(input.virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels, assignments),
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

    async removeInlineAssociation(input: AdminInlineAssociationInput): Promise<AdminVirtualChannelServiceResult<
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
            const virtualChannel = await this.virtualChannelDAO.get(input.virtualChannelId);

            if (!virtualChannel) {
                return this.buildInlineError(
                    'virtual_channel_not_found',
                    404,
                    'Virtual channel not found.',
                    input.virtualChannelId
                );
            }

            const currentAssignments = await this.assignmentDAO.listForVirtualChannel(input.virtualChannelId);
            const assignment = currentAssignments
                .find((candidate) => candidate.source_channel_id === input.sourceChannelId);

            if (!assignment) {
                return this.buildInlineError(
                    'assignment_not_found',
                    404,
                    'Assignment not found.',
                    input.virtualChannelId
                );
            }

            await this.assignmentDAO.remove(input.sourceChannelId, input.virtualChannelId);
            const assignments = await this.assignmentDAO.listForVirtualChannel(input.virtualChannelId);

            return {
                ok: true,
                data: {
                    group: this.buildVirtualChannelRow(virtualChannel, allSourceChannels, assignments),
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
        allSourceChannels: SourceChannel[],
        assignments: AdminAssignmentRows
    ): AdminVirtualChannelRow
    {
        // Shape the current assignments and remaining inline add options for one row.
        const sourceChannelsById = new Map(allSourceChannels.map((channel) => [channel.id, channel]));
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
// apply-patch-anchor - do not delete