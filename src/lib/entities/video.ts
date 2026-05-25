export enum VideoLengthClassification
{
    Long = 'long',
    Short = 'short',
    Unknown = 'unknown'
}

export type VideoFields = {
    id: string | number;
    channel_id: string | number;
    title: string;
    description?: string;
    published_at?: number | null;
    duration_seconds?: number | null;
    thumbnail_url?: string | null;
    length_classification: VideoLengthClassification;
    channel_title?: string;
    watched?: number;
    favorite?: number;
    ignored?: number;
};

export class Video
{
    readonly id: string | number; // stable video id
    readonly channel_id: string | number; // stable source channel id
    readonly title: string;
    readonly description?: string;
    readonly published_at?: number | null; // unix epoch ms
    readonly duration_seconds?: number | null;
    readonly thumbnail_url?: string | null;
    readonly length_classification: VideoLengthClassification;
    readonly channel_title: string;
    readonly watched: number;
    readonly favorite: number;
    readonly ignored: number;

    constructor(data: VideoFields)
    {
        this.id = data.id;
        this.channel_id = data.channel_id;
        this.title = data.title;
        this.description = data.description;
        this.published_at = data.published_at;
        this.duration_seconds = data.duration_seconds;
        this.thumbnail_url = data.thumbnail_url;
        this.length_classification = data.length_classification;
        this.channel_title = data.channel_title ?? '';
        this.watched = data.watched ?? 0;
        this.favorite = data.favorite ?? 0;
        this.ignored = data.ignored ?? 0;
    }

    toFields(): VideoFields
    {
        return {
            id: this.id,
            channel_id: this.channel_id,
            title: this.title,
            description: this.description,
            published_at: this.published_at,
            duration_seconds: this.duration_seconds,
            thumbnail_url: this.thumbnail_url,
            length_classification: this.length_classification,
            channel_title: this.channel_title,
            watched: this.watched,
            favorite: this.favorite,
            ignored: this.ignored
        };
    }

    static validate(value: any): value is Video
    {
        if (value instanceof Video) return true;
        return (
            value &&
            typeof value === 'object' &&
            (typeof (value as any).id === 'string' || typeof (value as any).id === 'number') &&
            (typeof (value as any).channel_id === 'string' || typeof (value as any).channel_id === 'number') &&
            typeof (value as any).title === 'string' &&
            ((value as any).description === undefined || typeof (value as any).description === 'string') &&
            ((value as any).published_at === undefined || (value as any).published_at === null || typeof (value as any).published_at === 'number') &&
            ((value as any).duration_seconds === undefined || (value as any).duration_seconds === null || typeof (value as any).duration_seconds === 'number') &&
            ((value as any).thumbnail_url === undefined || (value as any).thumbnail_url === null || typeof (value as any).thumbnail_url === 'string') &&
            ((value as any).channel_title === undefined || typeof (value as any).channel_title === 'string') &&
            ((value as any).watched === undefined || typeof (value as any).watched === 'number') &&
            ((value as any).favorite === undefined || typeof (value as any).favorite === 'number') &&
            ((value as any).ignored === undefined || typeof (value as any).ignored === 'number') &&
            (
                (value as any).length_classification === VideoLengthClassification.Long ||
                (value as any).length_classification === VideoLengthClassification.Short ||
                (value as any).length_classification === VideoLengthClassification.Unknown
            )
        );
    }

    with(patch: Update<Video>): Video
    {
        return new Video({
            id: (patch as any).id ?? this.id,
            channel_id: (patch as any).channel_id ?? this.channel_id,
            title: (patch as any).title ?? this.title,
            description: (patch as any).description ?? this.description,
            published_at: (patch as any).published_at ?? this.published_at,
            duration_seconds: (patch as any).duration_seconds ?? this.duration_seconds,
            thumbnail_url: (patch as any).thumbnail_url ?? this.thumbnail_url,
            length_classification: (patch as any).length_classification ?? this.length_classification,
            channel_title: (patch as any).channel_title ?? this.channel_title,
            watched: (patch as any).watched ?? this.watched,
            favorite: (patch as any).favorite ?? this.favorite,
            ignored: (patch as any).ignored ?? this.ignored
        });
    }
}
// apply-patch-anchor - do not delete
