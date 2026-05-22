import type { ViewerChannelFields } from '$lib/viewer/ViewerChannel';
import type { ViewerFilters } from '$lib/viewer/ViewerFilters';
import type { ViewerVideoFields } from '$lib/viewer/ViewerVideo';
import type { ViewerVirtualChannelFields } from '$lib/viewer/ViewerVirtualChannel';

export type ViewerPageData = {
    filters: ViewerFilters;
    videos: ViewerVideoFields[];
    totalCount: number;
    channels: ViewerChannelFields[];
    virtualChannels: ViewerVirtualChannelFields[];
    activeVirtualChannel: ViewerVirtualChannelFields | null;
    profileId: string | number;
    profileKey: string;
    profileName: string;
};
