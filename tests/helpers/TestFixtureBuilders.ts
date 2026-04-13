import type Database from 'better-sqlite3';

export type ReviewState = 'included' | 'ignored' | 'not_yet_reviewed';
export type AssignmentMode = 'all' | 'long_only' | 'selected_only';
export type LengthClassification = 'long' | 'short' | 'unknown';

export interface ProfileFixture
{
    id?: number;
    key: string;
    name: string;
}

export interface SourceChannelFixture
{
    id?: number;
    youtubeId: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    publishedAt: number | null;
    lastRefreshedAt: number | null;
}

export interface VideoFixture
{
    id?: number;
    youtubeId: string;
    channelId: number;
    title: string;
    description: string;
    publishedAt: number | null;
    durationSeconds: number | null;
    thumbnailUrl: string | null;
    lengthClassification: LengthClassification;
}

export interface VideoFlagFixture
{
    videoId: number;
    profileId: number;
    watched: number;
    ignored: number;
    favorite: number;
    updatedAt?: number;
}

export interface VirtualChannelFixture
{
    id?: number;
    name: string;
}

export interface AssignmentFixture
{
    id?: number;
    sourceChannelId: number;
    virtualChannelId: number;
    mode: AssignmentMode;
}

export interface AssignmentSelectionFixture
{
    assignmentId: number;
    videoId: number;
    reviewState: ReviewState;
}

const insertProfileStatement = `
    INSERT INTO profiles(id, key, name)
    VALUES (@id, @key, @name)
`;

const insertSourceChannelStatement = `
    INSERT INTO source_channels(id, youtube_id, title, description, thumbnail_url, published_at, last_refreshed_at)
    VALUES (@id, @youtube_id, @title, @description, @thumbnail_url, @published_at, @last_refreshed_at)
`;

const insertVideoStatement = `
    INSERT INTO videos(id, youtube_id, channel_id, title, description, published_at, duration_seconds, thumbnail_url, length_classification)
    VALUES (@id, @youtube_id, @channel_id, @title, @description, @published_at, @duration_seconds, @thumbnail_url, @length_classification)
`;

const insertVideoFlagStatement = `
    INSERT INTO video_flags(video_id, profile_id, watched, ignored, favorite, updated_at)
    VALUES (@video_id, @profile_id, @watched, @ignored, @favorite, @updated_at)
`;

const insertVirtualChannelStatement = `
    INSERT INTO virtual_channels(id, name)
    VALUES (@id, @name)
`;

const insertAssignmentStatement = `
    INSERT INTO virtual_channel_assignments(id, source_channel_id, virtual_channel_id, mode)
    VALUES (@id, @source_channel_id, @virtual_channel_id, @mode)
`;

const insertAssignmentSelectionStatement = `
    INSERT INTO virtual_channel_assignment_video_selections(assignment_id, video_id, review_state)
    VALUES (@assignment_id, @video_id, @review_state)
`;

function resolveInsertedId(result: Database.RunResult, explicitId?: number): number
{
    if (explicitId !== undefined) {
        return explicitId;
    }

    return Number(result.lastInsertRowid);
}

export function insertProfile(
    db: Database.Database,
    fixture: ProfileFixture
): Required<ProfileFixture>
{
    const result = db.prepare(insertProfileStatement).run({
        id: fixture.id ?? null,
        key: fixture.key,
        name: fixture.name
    });

    return {
        id: resolveInsertedId(result, fixture.id),
        key: fixture.key,
        name: fixture.name
    };
}

export function insertSourceChannel(
    db: Database.Database,
    fixture: SourceChannelFixture
): Required<SourceChannelFixture>
{
    const result = db.prepare(insertSourceChannelStatement).run({
        id: fixture.id ?? null,
        youtube_id: fixture.youtubeId,
        title: fixture.title,
        description: fixture.description,
        thumbnail_url: fixture.thumbnailUrl,
        published_at: fixture.publishedAt,
        last_refreshed_at: fixture.lastRefreshedAt
    });

    return {
        id: resolveInsertedId(result, fixture.id),
        youtubeId: fixture.youtubeId,
        title: fixture.title,
        description: fixture.description,
        thumbnailUrl: fixture.thumbnailUrl,
        publishedAt: fixture.publishedAt,
        lastRefreshedAt: fixture.lastRefreshedAt
    };
}

export function insertVideo(
    db: Database.Database,
    fixture: VideoFixture
): Required<VideoFixture>
{
    const result = db.prepare(insertVideoStatement).run({
        id: fixture.id ?? null,
        youtube_id: fixture.youtubeId,
        channel_id: fixture.channelId,
        title: fixture.title,
        description: fixture.description,
        published_at: fixture.publishedAt,
        duration_seconds: fixture.durationSeconds,
        thumbnail_url: fixture.thumbnailUrl,
        length_classification: fixture.lengthClassification
    });

    return {
        id: resolveInsertedId(result, fixture.id),
        youtubeId: fixture.youtubeId,
        channelId: fixture.channelId,
        title: fixture.title,
        description: fixture.description,
        publishedAt: fixture.publishedAt,
        durationSeconds: fixture.durationSeconds,
        thumbnailUrl: fixture.thumbnailUrl,
        lengthClassification: fixture.lengthClassification
    };
}

export function insertVideoFlag(
    db: Database.Database,
    fixture: VideoFlagFixture
): Required<VideoFlagFixture>
{
    db.prepare(insertVideoFlagStatement).run({
        video_id: fixture.videoId,
        profile_id: fixture.profileId,
        watched: fixture.watched,
        ignored: fixture.ignored,
        favorite: fixture.favorite,
        updated_at: fixture.updatedAt ?? 0
    });

    return {
        videoId: fixture.videoId,
        profileId: fixture.profileId,
        watched: fixture.watched,
        ignored: fixture.ignored,
        favorite: fixture.favorite,
        updatedAt: fixture.updatedAt ?? 0
    };
}

export function insertVirtualChannel(
    db: Database.Database,
    fixture: VirtualChannelFixture
): Required<VirtualChannelFixture>
{
    const result = db.prepare(insertVirtualChannelStatement).run({
        id: fixture.id ?? null,
        name: fixture.name
    });

    return {
        id: resolveInsertedId(result, fixture.id),
        name: fixture.name
    };
}

export function insertAssignment(
    db: Database.Database,
    fixture: AssignmentFixture
): Required<AssignmentFixture>
{
    const result = db.prepare(insertAssignmentStatement).run({
        id: fixture.id ?? null,
        source_channel_id: fixture.sourceChannelId,
        virtual_channel_id: fixture.virtualChannelId,
        mode: fixture.mode
    });

    return {
        id: resolveInsertedId(result, fixture.id),
        sourceChannelId: fixture.sourceChannelId,
        virtualChannelId: fixture.virtualChannelId,
        mode: fixture.mode
    };
}

export function insertAssignmentSelection(
    db: Database.Database,
    fixture: AssignmentSelectionFixture
): AssignmentSelectionFixture
{
    db.prepare(insertAssignmentSelectionStatement).run({
        assignment_id: fixture.assignmentId,
        video_id: fixture.videoId,
        review_state: fixture.reviewState
    });

    return fixture;
}
