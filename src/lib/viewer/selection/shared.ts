import type {
    ViewerSelectionFlagValue,
    ViewerSelectionVideoSnapshot,
    ViewerSelectionVideoState
} from '$lib/viewer/selection/types';

export class ViewerSelectionSupport
{
    public static normalizeIds(ids: number[]): number[]
    {
        return Array.from(
            new Set(
                ids.filter((value) => Number.isInteger(value) && value > 0)
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
        const snapshotMap = new Map<number, ViewerSelectionVideoSnapshot>();

        for (const video of videos) {
            const id = Number(video?.id);
            if (!Number.isInteger(id) || id <= 0) {
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
        selectedVideoIds: number[],
        selectedVideoState: Record<number, ViewerSelectionVideoState> | null | undefined
    ): Record<number, ViewerSelectionVideoState>
    {
        const selectedIdSet = new Set(this.normalizeIds(selectedVideoIds));
        const normalizedState: Record<number, ViewerSelectionVideoState> = {};

        for (const [rawId, snapshot] of Object.entries(selectedVideoState || {})) {
            const id = Number(rawId);
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
    ): Record<number, ViewerSelectionVideoState>
    {
        const snapshotMap: Record<number, ViewerSelectionVideoState> = {};

        for (const video of currentPageVideos) {
            snapshotMap[video.id] = {
                watched: video.watched,
                favorite: video.favorite,
                ignored: video.ignored
            };
        }

        return snapshotMap;
    }

    public static createCurrentPageVideoIds(currentPageVideos: ViewerSelectionVideoSnapshot[]): number[]
    {
        return currentPageVideos.map((video) => video.id);
    }
}
// apply-patch-anchor - do not delete