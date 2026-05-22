import type { ViewerFilterInputState, ViewerFilters } from '$lib/viewer/ViewerFilters';
import { ViewerIgnoredFilter, ViewerWatchedFilter } from '$lib/viewer/ViewerFilters';

export class ViewerPageNavigation
{
    private readonly filters: ViewerFilters;

    constructor(filters: ViewerFilters)
    {
        this.filters = filters;
    }

    buildPageHref(page: number): string
    {
        return `?${new URLSearchParams({
            term: this.filters.term || '',
            watched: this.filters.watched,
            ignored: this.filters.ignored,
            dateFrom: this.filters.dateFromInput,
            dateTo: this.filters.dateToInput,
            channelId: this.filters.channelId != null ? String(this.filters.channelId) : '',
            virtualChannelId: this.filters.virtualChannelId != null ? String(this.filters.virtualChannelId) : '',
            sort: this.filters.sort,
            limit: String(this.filters.limit),
            offset: String((page - 1) * this.filters.limit)
        }).toString()}`;
    }

    buildWatchHref(videoYoutubeId: string): string
    {
        const query = new URLSearchParams({
            term: this.filters.term || '',
            watched: this.filters.watched,
            ignored: this.filters.ignored,
            dateFrom: this.filters.dateFromInput,
            dateTo: this.filters.dateToInput,
            channelId: this.filters.channelId != null ? String(this.filters.channelId) : '',
            virtualChannelId: this.filters.virtualChannelId != null ? String(this.filters.virtualChannelId) : '',
            sort: this.filters.sort
        }).toString();

        return query
            ? `/viewer/watch/${videoYoutubeId}?${query}`
            : `/viewer/watch/${videoYoutubeId}`;
    }

    deriveFilterInputState(): ViewerFilterInputState
    {
        return {
            termInput: this.filters.term || '',
            dateFromInput: this.filters.dateFromInput,
            dateToInput: this.filters.dateToInput,
            channelIdInput: this.filters.channelId != null ? String(this.filters.channelId) : '',
            sortMode: this.filters.sort,
            limitInput: String(this.filters.limit),
            watchedMode: this.filters.watched,
            showIgnored: this.filters.ignored === ViewerIgnoredFilter.Show
        };
    }

    buildFilterQuery(inputState: ViewerFilterInputState): string
    {
        const params = new URLSearchParams({
            term: inputState.termInput,
            watched: inputState.watchedMode === ViewerWatchedFilter.Watched
                ? ViewerWatchedFilter.Watched
                : ViewerWatchedFilter.All,
            ignored: inputState.showIgnored ? ViewerIgnoredFilter.Show : ViewerIgnoredFilter.Hide,
            dateFrom: inputState.dateFromInput,
            dateTo: inputState.dateToInput,
            channelId: inputState.channelIdInput,
            virtualChannelId: this.filters.virtualChannelId != null ? String(this.filters.virtualChannelId) : '',
            sort: inputState.sortMode,
            limit: inputState.limitInput,
            offset: '0'
        });

        if (inputState.watchedMode === ViewerWatchedFilter.Unwatched) {
            params.set('unwatchedOnly', '1');
        }

        if (inputState.showIgnored) {
            params.set('showIgnored', '1');
        }

        return params.toString();
    }
}
