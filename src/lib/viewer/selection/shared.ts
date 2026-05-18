import type {
    ViewerSelectionFlagValue,
    ViewerSelectionVideoSnapshot,
    ViewerSelectionVideoState
} from '$lib/viewer/selection/types';

export class ViewerSelectionSupport
{
    public static normalizeIds(ids: Array<string | number>): string[]
    {
        return Array.from(
            new Set(
                ids
                    .map((value) => String(value).trim())
                    .filter((value) => value.length > 0)
            )
        );
    }

    public static normalizeFlagValue(value: unknown): ViewerSelectionFlagValue
    {
        return Number(value) === 1 ? 1 : 0;
    }

    public static normalizeVideoSnapshots(
        videos: ViewerSelectionVideoSnapshot[]
    ): ViewerSelectionVideoSnapshot[]
    {
        const snapshotMap = new Map<string, ViewerSelectionVideoSnapshot>();

        for (const video of videos) {
            const id = String(video?.id || '').trim();
            if (!id) {
                continue;
            }

            snapshotMap.set(id, {
                id,
                watched: this.normalizeFlagValue(video?.watched),
                favorite: this.normalizeFlagValue(video?.favorite),
                ignored: this.normalizeFlagValue(video?.ignored)
            });
        }

        return [...snapshotMap.values()];
    }

    public static createStateMap(
        selectedVideoIds: string[],
        selectedVideoState: Record<string, ViewerSelectionVideoState> | null | undefined
    ): Record<string, ViewerSelectionVideoState>
    {
        const selectedIdSet = new Set(this.normalizeIds(selectedVideoIds));
        const normalizedState: Record<string, ViewerSelectionVideoState> = {};

        for (const [rawId, snapshot] of Object.entries(selectedVideoState || {})) {
            const id = rawId.trim();
            if (!selectedIdSet.has(id)) {
                continue;
            }

            normalizedState[id] = {
                watched: this.normalizeFlagValue(snapshot?.watched),
                favorite: this.normalizeFlagValue(snapshot?.favorite),
                ignored: this.normalizeFlagValue(snapshot?.ignored)
            };
        }

        return normalizedState;
    }

    public static createCurrentPageVideoStateMap(
        currentPageVideos: ViewerSelectionVideoSnapshot[]
    ): Record<string, ViewerSelectionVideoState>
    {
        const snapshotMap: Record<string, ViewerSelectionVideoState> = {};

        for (const video of currentPageVideos) {
            snapshotMap[video.id] = {
                watched: video.watched,
                favorite: video.favorite,
                ignored: video.ignored
            };
        }

        return snapshotMap;
    }

    public static createCurrentPageVideoIds(currentPageVideos: ViewerSelectionVideoSnapshot[]): string[]
    {
        return currentPageVideos.map((video) => String(video.id));
    }
}
// apply-patch-anchor - do not delete
