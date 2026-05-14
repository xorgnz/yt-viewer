export type SourceChannelFields = {
    id: string | number;
    youtube_id: string;
    title: string;
    description?: string;
    thumbnail_url?: string | null;
    published_at?: number | null;
    last_refreshed_at?: number | null;
};

export class SourceChannel
{
    readonly id: string | number; // stable source channel id
    readonly youtubeId: string; // YouTube channel ID, same stable value as id
    readonly title: string;
    readonly description?: string;
    readonly thumbnailUrl?: string | null;
    readonly publishedAt?: number | null; // unix epoch ms
    readonly lastRefreshedAt?: number | null; // unix epoch ms

    constructor(data: SourceChannelFields)
    {
        this.id = data.id;
        this.youtubeId = data.youtube_id;
        this.title = data.title;
        this.description = data.description;
        this.thumbnailUrl = data.thumbnail_url;
        this.publishedAt = data.published_at;
        this.lastRefreshedAt = data.last_refreshed_at;
    }

    toFields(): SourceChannelFields
    {
        return {
            id: this.id,
            youtube_id: this.youtubeId,
            title: this.title,
            description: this.description,
            thumbnail_url: this.thumbnailUrl,
            published_at: this.publishedAt,
            last_refreshed_at: this.lastRefreshedAt,
        };
    }

    static validate(value: any): value is SourceChannel
    {
        if (value instanceof SourceChannel) return true;
        return (
            value !== null &&
            typeof value === 'object' &&
            (typeof (value as any).id === 'string' || typeof (value as any).id === 'number') &&
            typeof (value as any).youtubeId === 'string' &&
            typeof (value as any).title === 'string' &&
            ((value as any).description === undefined || typeof (value as any).description === 'string') &&
            ((value as any).thumbnailUrl === undefined || (value as any).thumbnailUrl === null || typeof (value as any).thumbnailUrl === 'string') &&
            ((value as any).publishedAt === undefined || (value as any).publishedAt === null || typeof (value as any).publishedAt === 'number') &&
            ((value as any).lastRefreshedAt === undefined || (value as any).lastRefreshedAt === null || typeof (value as any).lastRefreshedAt === 'number')
        );
    }

    with(patch: Update<SourceChannel>): SourceChannel
    {
        return new SourceChannel({
            id: (patch as any).id ?? this.id,
            youtube_id: (patch as any).youtubeId ?? this.youtubeId,
            title: (patch as any).title ?? this.title,
            description: (patch as any).description ?? this.description,
            thumbnail_url: (patch as any).thumbnailUrl ?? this.thumbnailUrl,
            published_at: (patch as any).publishedAt ?? this.publishedAt,
            last_refreshed_at: (patch as any).lastRefreshedAt ?? this.lastRefreshedAt
        });
    }
}
// apply-patch-anchor - do not delete
