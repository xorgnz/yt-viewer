export type VideoFlagsFields = {
    video_id: number;
    profile_id: number;
    ignored: 0 | 1;
    watched: 0 | 1;
    favorite: 0 | 1;
    updated_at: number;
};

export class VideoFlags
{
    readonly video_id: number; // internal video id
    readonly profile_id: number; // internal profile id
    readonly ignored: 0 | 1;
    readonly watched: 0 | 1;
    readonly favorite: 0 | 1;
    readonly updated_at: number; // unix epoch ms

    constructor(data: VideoFlagsFields)
    {
        this.video_id = data.video_id;
        this.profile_id = data.profile_id;
        this.ignored = data.ignored;
        this.watched = data.watched;
        this.favorite = data.favorite;
        this.updated_at = data.updated_at;
    }

    static validate(value: any): value is VideoFlags
    {
        if (value instanceof VideoFlags) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof (value as any).video_id === 'number' &&
            typeof (value as any).profile_id === 'number' &&
            (((value as any).ignored === 0) || ((value as any).ignored === 1)) &&
            (((value as any).watched === 0) || ((value as any).watched === 1)) &&
            (((value as any).favorite === 0) || ((value as any).favorite === 1)) &&
            typeof (value as any).updated_at === 'number'
        );
    }
}
