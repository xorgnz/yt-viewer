export type ChannelFields = {
    id: number;
    youtube_id: string;
    title: string;
    description?: string;
    thumbnail_url?: string | null;
    published_at?: number | null;
};

export class Channel
{
    readonly id: number; // internal DB id
    readonly youtube_id: string; // YouTube channel ID
    readonly title: string;
    readonly description?: string;
    readonly thumbnail_url?: string | null;
    readonly published_at?: number | null; // unix epoch ms

    constructor(data: ChannelFields)
    {
        this.id = data.id;
        this.youtube_id = data.youtube_id;
        this.title = data.title;
        this.description = data.description;
        this.thumbnail_url = data.thumbnail_url;
        this.published_at = data.published_at;
    }

    static validate(value: any): value is Channel
    {
        if (value instanceof Channel) return true;
        return (
            value !== null &&
            typeof value === 'object' &&
            typeof (value as any).id === 'number' &&
            typeof (value as any).youtube_id === 'string' &&
            typeof (value as any).title === 'string' &&
            ((value as any).description === undefined || typeof (value as any).description === 'string') &&
            ((value as any).thumbnail_url === undefined || (value as any).thumbnail_url === null || typeof (value as any).thumbnail_url === 'string') &&
            ((value as any).published_at === undefined || (value as any).published_at === null || typeof (value as any).published_at === 'number')
        );
    }
}
