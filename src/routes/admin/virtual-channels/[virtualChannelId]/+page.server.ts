import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { DatabaseMode, DatabaseWrapper } from '$lib/daos/shared/DatabaseWrapper';
import { VirtualChannelDAO } from '$lib/daos/virtualChannelDAO';
import { AssignmentDAO } from '$lib/daos/assignmentDAO';
import { SourceChannelDAO } from '$lib/daos/sourceChannelDAO';
import type { VirtualChannelAssignmentMode } from '$lib/entities/virtualChannelAssignment';
import type { VirtualChannelAssignmentVideoReviewState } from '$lib/entities/virtualChannelAssignmentVideoSelection';
import { VirtualChannelAssignmentVideoSelectionDAO } from '$lib/daos/virtualChannelAssignmentVideoSelectionDAO';
import { VideoDAO } from '$lib/daos/videoDAO';

function envToMode(): DatabaseMode
{
    const env = process.env.NODE_ENV;
    if (env === 'test') return DatabaseMode.Test;
    if (env === 'production') return DatabaseMode.Live;
    return DatabaseMode.Dev;
}

export const load: PageServerLoad = async ({ params, url }) =>
{
    // Validate the requested virtual channel id.
    const virtualChannelId = Number(params.virtualChannelId);

    if (!virtualChannelId) {
        throw error(404, 'Virtual channel not found');
    }

    const wrapper = new DatabaseWrapper(envToMode());
    const db = wrapper.open();

    try {
        // Load the virtual channel record first.
        const virtualChannelDAO = new VirtualChannelDAO(db);
        const virtualChannel = virtualChannelDAO.get(virtualChannelId);

        if (!virtualChannel) {
            throw error(404, 'Virtual channel not found');
        }

        // Load imported source channels and existing assignments for the page shell.
        const assignmentDAO = new AssignmentDAO(db);
        const sourceChannelDAO = new SourceChannelDAO(db);
        const availableSourceChannels = sourceChannelDAO.list();
        const sourceChannelsById = new Map(availableSourceChannels.map((channel) => [channel.id, channel]));
        const assignments = assignmentDAO.listForVirtualChannel(virtualChannelId);

        const videoDAO = new VideoDAO(db);
        const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);

        const associatedSourceChannels = assignments.map((assignment) => {
            const regexFilter = url.searchParams.get(`regexFilter-${assignment.id}`)?.trim() ?? '';
            const videoTypeFilter = (() => {
                const value = url.searchParams.get(`videoTypeFilter-${assignment.id}`);
                return value === 'long' || value === 'short' || value === 'unknown' ? value : 'all';
            })();
            const sourceVideos = videoDAO.listByChannel(assignment.source_channel_id);
            const selectionRows = assignment.mode === 'selected_only'
                ? selectionDAO.listForAssignment(assignment.id)
                : [];
            const selectionByVideoId = new Map(selectionRows.map((row) => [row.video_id, row]));
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
            const reviewStateFilter = url.searchParams.get(`reviewStateFilter-${assignment.id}`) === 'not_yet_reviewed'
                ? 'not_yet_reviewed'
                : 'all';

            return {
                assignment,
                sourceChannel: sourceChannelsById.get(assignment.source_channel_id) ?? null,
                automaticVideos,
                selectedOnlyVideos,
                selectedOnlyCounts,
                reviewStateFilter,
                regexFilter,
                videoTypeFilter
            };
        });

        return {
            virtualChannel,
            associatedSourceChannels,
            availableSourceChannels
        };
    } finally {
        wrapper.close();
    }
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

function parseVideoIds(form: FormData): number[]
{
    const repeatedValues = form.getAll('video_id');
    const csvValue = String(form.get('video_ids') || '');
    const rawValues = [
        ...repeatedValues.map((value) => String(value)),
        ...csvValue.split(',').map((value) => value.trim()).filter(Boolean)
    ];

    const ids = rawValues
        .map((value) => Number(value))
        .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

    return ids;
}

function parseReturnQuery(form: FormData): string
{
    const value = String(form.get('return_query') || '').trim().replace(/^\?+/, '');
    return value;
}

export const actions: Actions = {
    addAssociation: async ({ params, request }) => {
        // Validate the route and submitted source channel reference.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const sourceChannelId = Number(form.get('source_channel_id'));
        const mode = parseAssignmentMode(form.get('mode'));

        if (!Number.isInteger(sourceChannelId) || sourceChannelId <= 0) {
            return fail(400, { message: 'A valid source channel is required.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            // Ensure both sides of the association exist before inserting it.
            const virtualChannelDAO = new VirtualChannelDAO(db);
            const sourceChannelDAO = new SourceChannelDAO(db);
            const assignmentDAO = new AssignmentDAO(db);

            if (!virtualChannelDAO.get(virtualChannelId)) {
                throw error(404, 'Virtual channel not found');
            }

            if (!sourceChannelDAO.get(sourceChannelId)) {
                return fail(404, { message: 'Source channel not found.' });
            }

            assignmentDAO.add(sourceChannelId, virtualChannelId, mode);
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}`);
    },

    updateAssociationMode: async ({ params, request }) => {
        // Validate the assignment before changing its mode.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const assignmentId = Number(form.get('assignment_id'));
        const mode = parseAssignmentMode(form.get('mode'));

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            const assignmentDAO = new AssignmentDAO(db);
            const assignment = assignmentDAO.get(assignmentId);

            if (!assignment || assignment.virtual_channel_id !== virtualChannelId) {
                return fail(404, { message: 'Assignment not found.' });
            }

            assignmentDAO.updateMode(assignmentId, mode);
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}`);
    },

    removeAssociation: async ({ params, request }) => {
        // Remove only assignments that belong to the requested virtual channel.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const assignmentId = Number(form.get('assignment_id'));

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            const assignmentDAO = new AssignmentDAO(db);
            const assignment = assignmentDAO.get(assignmentId);

            if (!assignment || assignment.virtual_channel_id !== virtualChannelId) {
                return fail(404, { message: 'Assignment not found.' });
            }

            assignmentDAO.remove(assignment.source_channel_id, assignment.virtual_channel_id);
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}`);
    },

    setVideoReviewState: async ({ params, request }) => {
        // Persist a single selected-only review-state update.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const assignmentId = Number(form.get('assignment_id'));
        const videoId = Number(form.get('video_id'));
        const reviewState = parseReviewState(form.get('review_state'));

        if (!Number.isInteger(assignmentId) || assignmentId <= 0 || !Number.isInteger(videoId) || videoId <= 0) {
            return fail(400, { message: 'A valid assignment and video are required.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            const assignmentDAO = new AssignmentDAO(db);
            const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);
            const videoDAO = new VideoDAO(db);
            const assignment = assignmentDAO.get(assignmentId);
            const video = videoDAO.get(videoId);

            if (!assignment || assignment.virtual_channel_id !== virtualChannelId) {
                return fail(404, { message: 'Assignment not found.' });
            }

            if (assignment.mode !== 'selected_only') {
                return fail(400, { message: 'Video review state is only valid for selected-only assignments.' });
            }

            if (!video || video.channel_id !== assignment.source_channel_id) {
                return fail(404, { message: 'Video not found for this assignment.' });
            }

            selectionDAO.setReviewState(assignmentId, videoId, reviewState);
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}`);
    },

    bulkUpdateVideoReviewState: async ({ params, request }) => {
        // Persist a bulk selected-only review-state update for the submitted filtered set.
        const virtualChannelId = parseVirtualChannelId(params.virtualChannelId);
        if (!virtualChannelId) {
            throw error(404, 'Virtual channel not found');
        }

        const form = await request.formData();
        const assignmentId = Number(form.get('assignment_id'));
        const reviewState = parseReviewState(form.get('review_state'));
        const videoIds = parseVideoIds(form);
        const returnQuery = parseReturnQuery(form);

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
            return fail(400, { message: 'A valid assignment is required.' });
        }

        if (videoIds.length === 0) {
            return fail(400, { message: 'At least one video is required for bulk update.' });
        }

        const wrapper = new DatabaseWrapper(envToMode());
        const db = wrapper.open();

        try {
            const assignmentDAO = new AssignmentDAO(db);
            const selectionDAO = new VirtualChannelAssignmentVideoSelectionDAO(db);
            const videoDAO = new VideoDAO(db);
            const assignment = assignmentDAO.get(assignmentId);

            if (!assignment || assignment.virtual_channel_id !== virtualChannelId) {
                return fail(404, { message: 'Assignment not found.' });
            }

            if (assignment.mode !== 'selected_only') {
                return fail(400, { message: 'Bulk review updates are only valid for selected-only assignments.' });
            }

            for (const videoId of videoIds) {
                const video = videoDAO.get(videoId);
                if (!video || video.channel_id !== assignment.source_channel_id) {
                    return fail(404, { message: `Video ${videoId} is not available for this assignment.` });
                }
            }

            for (const videoId of videoIds) {
                selectionDAO.setReviewState(assignmentId, videoId, reviewState);
            }
        } finally {
            wrapper.close();
        }

        throw redirect(303, `/admin/virtual-channels/${virtualChannelId}${returnQuery ? `?${returnQuery}` : ''}`);
    }
};
