export type SourceChannelFields = {
    id: string | number;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    publishedAt?: number | null;
    lastRefreshedAt?: number | null;
};

export type SourceChannelSFO = SourceChannelFields;


export class SourceChannel
{
    readonly id: string | number; // stable source channel id
    readonly title: string;
    readonly description?: string;
    readonly thumbnailUrl?: string | null;
    readonly publishedAt?: number | null; // unix epoch ms
    readonly lastRefreshedAt?: number | null; // unix epoch ms

    constructor(data: SourceChannelFields)
    {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.thumbnailUrl = data.thumbnailUrl;
        this.publishedAt = data.publishedAt;
        this.lastRefreshedAt = data.lastRefreshedAt;
    }

    serialize(): SourceChannelSFO
    {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            thumbnailUrl: this.thumbnailUrl,
            publishedAt: this.publishedAt,
            lastRefreshedAt: this.lastRefreshedAt,
        };
    }

    static deserialize(serialFormObject: SourceChannelSFO): SourceChannel
    {
        return new SourceChannel({
            id: serialFormObject.id,
            title: serialFormObject.title,
            description: serialFormObject.description,
            thumbnailUrl: serialFormObject.thumbnailUrl,
            publishedAt: serialFormObject.publishedAt,
            lastRefreshedAt: serialFormObject.lastRefreshedAt,
        });
    }

    static validate(value: any): value is SourceChannel
    {
        if (value instanceof SourceChannel) return true;
        return (
            value !== null &&
            typeof value === 'object' &&
            (typeof (value as any).id === 'string' || typeof (value as any).id === 'number') &&
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
            title: (patch as any).title ?? this.title,
            description: (patch as any).description ?? this.description,
            thumbnailUrl: (patch as any).thumbnailUrl ?? this.thumbnailUrl,
            publishedAt: (patch as any).publishedAt ?? this.publishedAt,
            lastRefreshedAt: (patch as any).lastRefreshedAt ?? this.lastRefreshedAt
        });
    }
}
// apply-patch-anchor - do not delete
