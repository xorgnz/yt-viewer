import type { SourceChannelFields } from '$lib/entities/sourceChannel';
import type { VideoFields } from '$lib/entities/video';
import type { VirtualChannelFields } from '$lib/entities/virtualChannel';
import type { ViewerFilters } from '$lib/viewer/ViewerFilters';

export type ViewerPageData = {
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
