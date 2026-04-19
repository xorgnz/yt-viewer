import type {
    ViewerSelectionContextInput
} from '$lib/viewer/selection/types';

export class ViewerSelectionContext
{
    public readonly profileKey: string;
    public readonly term: string;
    public readonly watched: 'all' | 'watched' | 'unwatched';
    public readonly ignored: 'hide' | 'show';
    public readonly dateFromInput: string;
    public readonly dateToInput: string;
    public readonly channelId: number | null;
    public readonly groupId: number | null;

    public constructor(input: ViewerSelectionContextInput)
    {
        this.profileKey = input.profileKey;
        this.term = input.term || '';
        this.watched = input.watched;
        this.ignored = input.ignored;
        this.dateFromInput = input.dateFromInput;
        this.dateToInput = input.dateToInput;
        this.channelId = input.channelId;
        this.groupId = input.groupId;
    }

    public static createKey(input: ViewerSelectionContextInput): string
    {
        return new ViewerSelectionContext(input).toKey();
    }

    public toKey(): string
    {
        return new URLSearchParams({
            profileKey: this.profileKey,
            term: this.term,
            watched: this.watched,
            ignored: this.ignored,
            dateFrom: this.dateFromInput,
            dateTo: this.dateToInput,
            channelId: this.channelId != null ? String(this.channelId) : '',
            groupId: this.groupId != null ? String(this.groupId) : ''
        }).toString();
    }
}
// apply-patch-anchor - do not delete