export type ViewerVideoFields = {
    id: string | number;
    youtube_id: string;
    channel_id: string | number;
    title: string;
    description: string;
    published_at: number | null;
    duration_seconds: number | null;
    thumbnail_url: string | null;
    channel_title: string;
    channel_youtube_id: string;
    watched: number;
    favorite: number;
    ignored: number;
};

export class ViewerVideo
{
    readonly id: string | number;
    readonly youtube_id: string;
    readonly channel_id: string | number;
    readonly title: string;
    readonly description: string;
    readonly published_at: number | null;
    readonly duration_seconds: number | null;
    readonly thumbnail_url: string | null;
    readonly channel_title: string;
    readonly channel_youtube_id: string;
    readonly watched: number;
    readonly favorite: number;
    readonly ignored: number;

    constructor(fields: ViewerVideoFields)
    {
        this.id = fields.id;
        this.youtube_id = fields.youtube_id;
        this.channel_id = fields.channel_id;
        this.title = fields.title;
        this.description = fields.description;
        this.published_at = fields.published_at;
        this.duration_seconds = fields.duration_seconds;
        this.thumbnail_url = fields.thumbnail_url;
        this.channel_title = fields.channel_title;
        this.channel_youtube_id = fields.channel_youtube_id;
        this.watched = fields.watched;
        this.favorite = fields.favorite;
        this.ignored = fields.ignored;
    }
}

export type ViewerCardClickHandler = (event: MouseEvent | KeyboardEvent, videoId: string | number) => void;
export type ViewerCardMouseDownHandler = (event: MouseEvent, videoId: string | number) => void;
