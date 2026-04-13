import { ViewerSelectionSupport } from '$lib/viewer/selection/shared';
import type {
    ViewerSelectionState,
    ViewerSelectionVideoSnapshot
} from '$lib/viewer/selection/types';

interface PersistedViewerSelectionState
{
    selectedVideoIds: number[];
    anchorVideoId: number | null;
    selectedVideoState?: ViewerSelectionState['selectedVideoState'];
    baselineSelectedVideoState?: ViewerSelectionState['baselineSelectedVideoState'];
}

class ViewerSelectionSessionStore
{
    private readonly storagePrefix: string;

    public constructor(storagePrefix = 'ytcw-viewer-selection:')
    {
        this.storagePrefix = storagePrefix;
    }

    public load(
        contextKey: string,
        currentPageVideos: ViewerSelectionVideoSnapshot[]
    ): ViewerSelectionState | null
    {
        if (typeof window === 'undefined') {
            return null;
        }

        const raw = window.sessionStorage.getItem(`${this.storagePrefix}${contextKey}`);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as PersistedViewerSelectionState;
            const selectedVideoIds = ViewerSelectionSupport.normalizeIds(parsed?.selectedVideoIds || []);
            const anchorVideoId = parsed?.anchorVideoId != null && selectedVideoIds.includes(parsed.anchorVideoId)
                ? parsed.anchorVideoId
                : null;
            const normalizedCurrentPageVideos = ViewerSelectionSupport.normalizeVideoSnapshots(currentPageVideos);
            const selectedVideoState = ViewerSelectionSupport.createStateMap(selectedVideoIds, parsed?.selectedVideoState);
            const baselineSelectedVideoState = ViewerSelectionSupport.createStateMap(
                selectedVideoIds,
                parsed?.baselineSelectedVideoState ?? parsed?.selectedVideoState
            );
            const currentPageVideoState = ViewerSelectionSupport.createCurrentPageVideoStateMap(normalizedCurrentPageVideos);

            for (const videoId of selectedVideoIds) {
                if (currentPageVideoState[videoId]) {
                    selectedVideoState[videoId] = currentPageVideoState[videoId];
                }
            }

            return {
                contextKey,
                selectedVideoIds,
                anchorVideoId,
                currentPageVideoIds: ViewerSelectionSupport.createCurrentPageVideoIds(normalizedCurrentPageVideos),
                currentPageVideos: normalizedCurrentPageVideos,
                selectedVideoState,
                baselineSelectedVideoState
            };
        } catch {
            window.sessionStorage.removeItem(`${this.storagePrefix}${contextKey}`);
            return null;
        }
    }

    public persist(state: ViewerSelectionState)
    {
        if (typeof window === 'undefined') {
            return;
        }

        const storageKey = `${this.storagePrefix}${state.contextKey}`;
        if (state.selectedVideoIds.length === 0 && state.anchorVideoId == null) {
            window.sessionStorage.removeItem(storageKey);
            return;
        }

        const payload: PersistedViewerSelectionState = {
            selectedVideoIds: ViewerSelectionSupport.normalizeIds(state.selectedVideoIds),
            anchorVideoId: state.anchorVideoId,
            selectedVideoState: ViewerSelectionSupport.createStateMap(state.selectedVideoIds, state.selectedVideoState),
            baselineSelectedVideoState: ViewerSelectionSupport.createStateMap(
                state.selectedVideoIds,
                state.baselineSelectedVideoState
            )
        };
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
    }

    public clear(contextKey: string)
    {
        if (typeof window === 'undefined' || !contextKey) {
            return;
        }

        window.sessionStorage.removeItem(`${this.storagePrefix}${contextKey}`);
    }
}

export const viewerSelectionSessionStore = new ViewerSelectionSessionStore();
