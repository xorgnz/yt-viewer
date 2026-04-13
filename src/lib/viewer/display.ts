import type { ViewerVideo } from '$lib/viewer/types';
import type {
    ViewerSelectionFlagKind,
    ViewerSelectionFlagValue
} from '$lib/viewer/selection/types';

export type ViewerFlagToggleHandler = (
    videoId: number,
    kind: ViewerSelectionFlagKind,
    value: ViewerSelectionFlagValue
) => void | Promise<void>;

export interface ViewerVideoDisplayState
{
    isIgnored: boolean;
    isFavorite: boolean;
    isWatched: boolean;
    isFavoriteWatched: boolean;
    isFavoriteOnly: boolean;
    isWatchedOnly: boolean;
    publishedDate: string;
    watchHref: string;
    openLabel: string;
}

export class ViewerVideoDisplayPresenter
{
    private readonly video: ViewerVideo;

    public constructor(video: ViewerVideo)
    {
        this.video = video;
    }

    public getState(): ViewerVideoDisplayState
    {
        const isIgnored = !!this.video.ignored;
        const isFavorite = !!this.video.favorite;
        const isWatched = !!this.video.watched;

        return {
            isIgnored,
            isFavorite,
            isWatched,
            isFavoriteWatched: !isIgnored && isFavorite && isWatched,
            isFavoriteOnly: !isIgnored && isFavorite && !isWatched,
            isWatchedOnly: !isIgnored && isWatched && !isFavorite,
            publishedDate: this.formatDate(this.video.published_at),
            watchHref: `/viewer/watch/${this.video.youtube_id}`,
            openLabel: `Open ${this.video.title}`
        };
    }

    public getNextFlagValue(kind: ViewerSelectionFlagKind): ViewerSelectionFlagValue
    {
        return this.video[kind] ? 0 : 1;
    }

    public getToggleTitle(kind: ViewerSelectionFlagKind): string
    {
        const isActive = !!this.video[kind];

        if (kind === 'favorite') {
            return isActive ? 'Unfavorite' : 'Mark favorite';
        }

        if (kind === 'watched') {
            return isActive ? 'Mark unwatched' : 'Mark watched';
        }

        return isActive ? 'Unignore' : 'Ignore video';
    }

    public getToggleLabel(kind: ViewerSelectionFlagKind): string
    {
        return this.getToggleTitle(kind);
    }

    private formatDate(ms: number | null): string
    {
        if (!ms) {
            return '';
        }

        try {
            return new Date(ms).toISOString().slice(0, 10);
        } catch {
            return '';
        }
    }
}
