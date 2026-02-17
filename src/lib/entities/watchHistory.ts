export type WatchHistoryFields = {
    id: number;
    video_id: number;
    profile_id: number;
    watched_at: number;
};

export class WatchHistory
{
    readonly id: number;
    readonly video_id: number;
    readonly profile_id: number;
    readonly watched_at: number; // unix epoch ms

    constructor(data: WatchHistoryFields)
    {
        this.id = data.id;
        this.video_id = data.video_id;
        this.profile_id = data.profile_id;
        this.watched_at = data.watched_at;
    }

    static validate(value: any): value is WatchHistory
    {
        if (value instanceof WatchHistory) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof (value as any).id === 'number' &&
            typeof (value as any).video_id === 'number' &&
            typeof (value as any).profile_id === 'number' &&
            typeof (value as any).watched_at === 'number'
        );
    }

    with(patch: Update<WatchHistory>): WatchHistory
    {
        return new WatchHistory({
            id: (patch as any).id ?? this.id,
            video_id: (patch as any).video_id ?? this.video_id,
            profile_id: (patch as any).profile_id ?? this.profile_id,
            watched_at: (patch as any).watched_at ?? this.watched_at
        });
    }
}
