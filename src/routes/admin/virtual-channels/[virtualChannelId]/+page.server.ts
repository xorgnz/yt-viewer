import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import { ServerDatabaseContext } from '$lib/server/ServerDatabaseContext';
import { ServerActionForm } from '$lib/server/ServerActionForm';
import { AdminVirtualChannelServiceContext } from '$lib/server/admin/AdminVirtualChannelServiceContext';
import { VirtualChannelAssignmentVideoReviewState as ReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';

export const load: PageServerLoad = async ({ params, url }) =>
{
    // Validate the requested virtual channel id.
    const virtualChannelId = params.virtualChannelId?.trim() || null;

    if (!virtualChannelId) {
        throw error(404, 'Virtual channel not found');
    }

    return ServerDatabaseContext.run(async ({ db }) => {
        const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
        const result = await serviceContext.manageService.loadPageData(
            virtualChannelId,
            url.searchParams
        );

        if (!result.ok) {
            throw error(result.error.status, result.error.message);
        }

        return {
            ...result.data,
            virtualChannel: result.data.virtualChannel.serialize()
        };
    });
};

function parseVirtualChannelId(value: string): string | null
{
    const id = value.trim();
    return id ? id : null;
}

function parseAssignmentMode(value: FormDataEntryValue | null): VirtualChannelAssignmentMode
{
    return value === VirtualChannelAssignmentMode.LongOnly || value === VirtualChannelAssignmentMode.SelectedOnly
        ? value
        : VirtualChannelAssignmentMode.All;
}

function parseReviewState(value: FormDataEntryValue | null): VirtualChannelAssignmentVideoReviewState
{
    return value === ReviewState.Included || value === ReviewState.Ignored ? value : ReviewState.NotYetReviewed;
}

function parseDailyTimerMode(value: FormDataEntryValue | null): 'unlimited' | 'capped'
{
    return value === 'capped' ? 'capped' : 'unlimited';
}

export const actions: Actions = {
    saveTimerSettings: async ({ params, request }) => {
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const timerMode = parseDailyTimerMode(form.getRaw('timer_mode'));
        const dailyTimerMaxInput = form.getTrimmedString('daily_timer_max');

        if (timerMode === 'capped') {
            if (!dailyTimerMaxInput) {
                return fail(400, {
                    action: 'saveTimerSettings',
                    message: 'Daily timer seconds are required when the timer is enabled.',
                    timerMode,
                    dailyTimerMaxInput
                });
            }

            const parsedDailyTimerMax = Number(dailyTimerMaxInput);
            if (!Number.isInteger(parsedDailyTimerMax) || parsedDailyTimerMax <= 0) {
                return fail(400, {
                    action: 'saveTimerSettings',
                    message: 'Daily timer seconds must be a positive whole number.',
                    timerMode,
                    dailyTimerMaxInput
                });
            }

            return ServerDatabaseContext.run(async ({ db }) => {
                const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
                const result = await serviceContext.manageService.updateTimerSettings(
                    virtualChannelId,
                    parsedDailyTimerMax
                );

                if (!result.ok) {
                    throw error(result.error.status, result.error.message);
                }

                throw redirect(303, result.data);
            });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.updateTimerSettings(virtualChannelId, null);

            if (!result.ok) {
                throw error(result.error.status, result.error.message);
            }

            throw redirect(303, result.data);
        });
    },

    grantExtraTime: async ({ params, request }) => {
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const grantExtraSecondsInput = form.getTrimmedString('grant_extra_seconds');

        if (!grantExtraSecondsInput) {
            return fail(400, {
                action: 'grantExtraTime',
                message: 'Extra timer seconds are required.',
                grantExtraSecondsInput
            });
        }

        const parsedGrantSeconds = Number(grantExtraSecondsInput);
        if (!Number.isInteger(parsedGrantSeconds) || parsedGrantSeconds <= 0) {
            return fail(400, {
                action: 'grantExtraTime',
                message: 'Extra timer seconds must be a positive whole number.',
                grantExtraSecondsInput
            });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.grantExtraTimerSeconds(
                virtualChannelId,
                parsedGrantSeconds
            );

            if (!result.ok) {
                throw error(result.error.status, result.error.message);
            }

            throw redirect(303, result.data);
        });
    },

    addAssociation: async ({ params, request }) => {
        // Validate the route and submitted source channel reference.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const sourceChannelId = form.getIdentifier('source_channel_id');
        const mode = parseAssignmentMode(form.getRaw('mode'));

        if (sourceChannelId === null) {
            return fail(400, { message: 'A valid source channel is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.addAssociation(
                virtualChannelId,
                sourceChannelId,
                mode
            );

            if (!result.ok) {
                if (result.error.code === 'virtual_channel_not_found') {
                    throw error(result.error.status, result.error.message);
                }

                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data);
        });
    },

    updateAssociationMode: async ({ params, request }) => {
        // Validate the assignment before changing its mode.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getIdentifier('assignment_id');
        const mode = parseAssignmentMode(form.getRaw('mode'));

        if (assignmentId === null) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.updateAssociationMode(
                virtualChannelId,
                assignmentId,
                mode
            );

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data);
        });
    },

    removeAssociation: async ({ params, request }) => {
        // Remove only assignments that belong to the requested virtual channel.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getIdentifier('assignment_id');

        if (assignmentId === null) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.removeAssociation(
                virtualChannelId,
                assignmentId
            );

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data);
        });
    },

    setVideoReviewState: async ({ params, request }) => {
        // Persist a single selected-only review-state update.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getIdentifier('assignment_id');
        const videoId = form.getIdentifier('video_id');
        const reviewState = parseReviewState(form.getRaw('review_state'));

        if (assignmentId === null || videoId === null) {
            return fail(400, { message: 'A valid assignment and video are required.' });
        }

        return ServerDatabaseContext.run(async ({ db }) => {
            const serviceContext = AdminVirtualChannelServiceContext.resolve(db);
            const result = await serviceContext.manageService.setVideoReviewState(
                virtualChannelId,
                assignmentId,
                videoId,
                reviewState
            );

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data);
        });
    },

    bulkUpdateVideoReviewState: async ({ params, request }) => {
        // Persist a bulk selected-only review-state update for the submitted filtered set.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await ServerActionForm.fromRequest(request);
        const assignmentId = form.getIdentifier('assignment_id');
        const reviewState = parseReviewState(form.getRaw('review_state'));
        const videoIds = form.getIdentifierList({
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
            const result = await serviceContext.manageService.bulkUpdateVideoReviewState(
                virtualChannelId,
                assignmentId,
                videoIds,
                reviewState,
                returnQuery
            );

            if (!result.ok) {
                return fail(result.error.status, { message: result.error.message });
            }

            throw redirect(303, result.data);
        });
    }
};
// apply-patch-anchor - do not delete
