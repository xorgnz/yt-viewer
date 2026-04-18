import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { AdminVirtualChannelServiceContext } from '$lib/server/admin/AdminVirtualChannelServiceContext';

export const load: PageServerLoad = async ({ params, url }) =>
{
    // Validate the requested virtual channel id.
    const virtualChannelId = Number(params.virtualChannelId);

    if (!virtualChannelId) {
        throw error(404, 'Virtual channel not found');
    }

    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
        const result = await serviceContext.manageService.loadPageData({
            virtualChannelId,
            searchParams: url.searchParams
        });

        if (!result.ok) {
            throw error(result.error.status, result.error.message);
        }

        return result.data;
    });
};

function parseVirtualChannelId(value: string): number | null
{
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAssignmentMode(value: FormDataEntryValue | null): VirtualChannelAssignmentMode
{
    return value === 'long_only' || value === 'selected_only' ? value : 'all';
}

function parseReviewState(value: FormDataEntryValue | null): VirtualChannelAssignmentVideoReviewState
{
    return value === 'included' || value === 'ignored' ? value : 'not_yet_reviewed';
}

export const actions: Actions = {
    addAssociation: async ({ params, request }) => {
        // Validate the route and submitted source channel reference.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const sourceChannelId = form.getPositiveInteger('source_channel_id');
        const mode = parseAssignmentMode(form.getRaw('mode'));

        if (sourceChannelId === null) {
            return fail(400, { message: 'A valid source channel is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.addAssociation({
                virtualChannelId,
                sourceChannelId,
                mode
            });

            if (!result.ok) {
                if (result.error.code === 'virtual_channel_not_found') {
                    throw error(result.error.status, result.error.message);
                }

                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data.redirectTo);
        });
    },

    updateAssociationMode: async ({ params, request }) => {
        // Validate the assignment before changing its mode.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getPositiveInteger('assignment_id');
        const mode = parseAssignmentMode(form.getRaw('mode'));

        if (assignmentId === null) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.updateAssociationMode({
                virtualChannelId,
                assignmentId,
                mode
            });

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data.redirectTo);
        });
    },

    removeAssociation: async ({ params, request }) => {
        // Remove only assignments that belong to the requested virtual channel.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getPositiveInteger('assignment_id');

        if (assignmentId === null) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.removeAssociation({
                virtualChannelId,
                assignmentId
            });

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data.redirectTo);
        });
    },

    setVideoReviewState: async ({ params, request }) => {
        // Persist a single selected-only review-state update.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getPositiveInteger('assignment_id');
        const videoId = form.getPositiveInteger('video_id');
        const reviewState = parseReviewState(form.getRaw('review_state'));

        if (assignmentId === null || videoId === null) {
            return fail(400, { message: 'A valid assignment and video are required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.setVideoReviewState({
                virtualChannelId,
                assignmentId,
                videoId,
                reviewState
            });

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data.redirectTo);
        });
    },

    bulkUpdateVideoReviewState: async ({ params, request }) => {
        // Persist a bulk selected-only review-state update for the submitted filtered set.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getPositiveInteger('assignment_id');
        const reviewState = parseReviewState(form.getRaw('review_state'));
        const videoIds = form.getPositiveIntegerList({
            repeatedField: 'video_id',
            csvField: 'video_ids'
        });
        const returnQuery = form.getSanitizedQueryString('return_query');

        if (assignmentId === null) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        if (videoIds.length === 0) {
            return fail(400, { message: 'At least one video is required for bulk update.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.bulkUpdateVideoReviewState({
                virtualChannelId,
                assignmentId,
                videoIds,
                reviewState,
                returnQuery
            });

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data.redirectTo);
        });
    }
};
