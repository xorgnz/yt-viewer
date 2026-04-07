export type WatchHistoryFields = {
    id: number;
    video_id: number;
    profile_id: number;
    session_started_at: number;
    last_updated_at: number;
    time_watched_seconds: number;
};

export class WatchHistory
{
    readonly id: number;
    readonly video_id: number;
    readonly profile_id: number;
    readonly session_started_at: number;   // unix epoch ms
    readonly last_updated_at: number;      // unix epoch ms
    readonly time_watched_seconds: number; // accumulated seconds

    constructor(data: WatchHistoryFields)
    {
        this.id = data.id;
        this.video_id = data.video_id;
        this.profile_id = data.profile_id;
        this.session_started_at = data.session_started_at;
        this.last_updated_at = data.last_updated_at;
        this.time_watched_seconds = data.time_watched_seconds;
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
            typeof (value as any).session_started_at === 'number' &&
            typeof (value as any).last_updated_at === 'number' &&
            typeof (value as any).time_watched_seconds === 'number'
        );
    }

    with(patch: Update<WatchHistory>): WatchHistory
    {
        return new WatchHistory({
            id: (patch as any).id ?? this.id,
            video_id: (patch as any).video_id ?? this.video_id,
            profile_id: (patch as any).profile_id ?? this.profile_id,
            session_started_at: (patch as any).session_started_at ?? this.session_started_at,
            last_updated_at: (patch as any).last_updated_at ?? this.last_updated_at,
            time_watched_seconds: (patch as any).time_watched_seconds ?? this.time_watched_seconds
        });
    }
}
