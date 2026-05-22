import type { SourceChannelFields } from '$lib/entities/sourceChannel';
import type { VideoFields } from '$lib/entities/video';
import type { VirtualChannelFields } from '$lib/entities/virtualChannel';
import type { ViewerFilters } from '$lib/viewer/ViewerFilters';
import { ViewerPageNavigation } from '$lib/viewer/ViewerPageNavigation';

export enum ViewerVisiblePageMarker
{
    Ellipsis = 'ellipsis'
}

export type ViewerVisiblePage = number | ViewerVisiblePageMarker;

export type ViewerPagePaginationState = {
    totalPages: number;
    currentPage: number;
    visiblePages: ViewerVisiblePage[];
};

export type ViewerPageStateFields = {
    filters: ViewerFilters;
    videos: VideoFields[];
    totalCount: number;
    channels: SourceChannelFields[];
    virtualChannels: VirtualChannelFields[];
    activeVirtualChannel: VirtualChannelFields | null;
    profileId: string | number;
    profileKey: string;
    profileName: string;
};

export class ViewerPageState
{
    readonly filters: ViewerFilters;
    readonly videos: VideoFields[];
    readonly totalCount: number;
    readonly channels: SourceChannelFields[];
    readonly virtualChannels: VirtualChannelFields[];
    readonly activeVirtualChannel: VirtualChannelFields | null;
    readonly profileId: string | number;
    readonly profileKey: string;
    readonly profileName: string;
    readonly navigation: ViewerPageNavigation;

    constructor(fields: ViewerPageStateFields)
    {
        this.filters = fields.filters;
        this.videos = fields.videos;
        this.totalCount = fields.totalCount;
        this.channels = fields.channels;
        this.virtualChannels = fields.virtualChannels;
        this.activeVirtualChannel = fields.activeVirtualChannel;
        this.profileId = fields.profileId;
        this.profileKey = fields.profileKey;
        this.profileName = fields.profileName;
        this.navigation = new ViewerPageNavigation(fields.filters);
    }

    derivePaginationState(): ViewerPagePaginationState
    {
        const totalPages = Math.max(1, Math.ceil(this.totalCount / this.filters.limit));
        const currentPage = Math.min(totalPages, Math.floor(this.filters.offset / this.filters.limit) + 1);

        return {
            totalPages,
            currentPage,
            visiblePages: ViewerPageState.getVisiblePages(currentPage, totalPages)
        };
    }

    toFields(): ViewerPageStateFields
    {
        return {
            filters: this.filters,
            videos: this.videos,
            totalCount: this.totalCount,
            channels: this.channels,
            virtualChannels: this.virtualChannels,
            activeVirtualChannel: this.activeVirtualChannel,
            profileId: this.profileId,
            profileKey: this.profileKey,
            profileName: this.profileName
        };
    }

    private static getVisiblePages(current: number, total: number): ViewerVisiblePage[]
    {
        if (total <= 11) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }

        const windowSize = 9;
        const halfWindow = Math.floor(windowSize / 2);
        let start = Math.max(2, current - halfWindow);
        let end = Math.min(total - 1, current + halfWindow);

        if ((end - start + 1) < windowSize) {
            if (start === 2) {
                end = Math.min(total - 1, start + windowSize - 1);
            } else if (end === total - 1) {
                start = Math.max(2, end - windowSize + 1);
            }
        }

        const pages: ViewerVisiblePage[] = [1];

        if (start > 2) {
            pages.push(ViewerVisiblePageMarker.Ellipsis);
        }

        for (let page = start; page <= end; page += 1) {
            pages.push(page);
        }

        if (end < total - 1) {
            pages.push(ViewerVisiblePageMarker.Ellipsis);
        }

        pages.push(total);
        return pages;
    }
}
