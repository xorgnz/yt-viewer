export type VideoFields = {
    id: number;
    youtube_id: string;
    channel_id: number;
    title: string;
    description?: string;
    published_at?: number | null;
    duration_seconds?: number | null;
    thumbnail_url?: string | null;
};

export class Video
{
    readonly id: number; // internal DB id
    readonly youtube_id: string; // YouTube video ID
    readonly channel_id: number; // internal channel id
    readonly title: string;
    readonly description?: string;
    readonly published_at?: number | null; // unix epoch ms
    readonly duration_seconds?: number | null;
    readonly thumbnail_url?: string | null;

    constructor(data: VideoFields)
    {
        this.id = data.id;
        this.youtube_id = data.youtube_id;
        this.channel_id = data.channel_id;
        this.title = data.title;
        this.description = data.description;
        this.published_at = data.published_at;
        this.duration_seconds = data.duration_seconds;
        this.thumbnail_url = data.thumbnail_url;
    }

    static validate(value: any): value is Video
    {
        if (value instanceof Video) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof (value as any).id === 'number' &&
            typeof (value as any).youtube_id === 'string' &&
            typeof (value as any).channel_id === 'number' &&
            typeof (value as any).title === 'string' &&
            ((value as any).description === undefined || typeof (value as any).description === 'string') &&
            ((value as any).published_at === undefined || (value as any).published_at === null || typeof (value as any).published_at === 'number') &&
            ((value as any).duration_seconds === undefined || (value as any).duration_seconds === null || typeof (value as any).duration_seconds === 'number') &&
            ((value as any).thumbnail_url === undefined || (value as any).thumbnail_url === null || typeof (value as any).thumbnail_url === 'string')
        );
    }

    with(patch: Update<Video>): Video
    {
        return new Video({
            id: (patch as any).id ?? this.id,
            youtube_id: (patch as any).youtube_id ?? this.youtube_id,
            channel_id: (patch as any).channel_id ?? this.channel_id,
            title: (patch as any).title ?? this.title,
            description: (patch as any).description ?? this.description,
            published_at: (patch as any).published_at ?? this.published_at,
            duration_seconds: (patch as any).duration_seconds ?? this.duration_seconds,
            thumbnail_url: (patch as any).thumbnail_url ?? this.thumbnail_url
        });
    }
}
