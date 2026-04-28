import type { ViewerSort } from '$lib/viewer/types';

const VIEWER_SORT_SESSION_KEY = 'viewer.sort';

function isViewerSort(value: string | null): value is ViewerSort
{
    return value === 'newest' || value === 'oldest' || value === 'title_asc' || value === 'title_desc';
}

function load(): ViewerSort | null
{
    try {
        const value = window.sessionStorage.getItem(VIEWER_SORT_SESSION_KEY);
        return isViewerSort(value) ? value : null;
    } catch {
        return null;
    }
}

function persist(sort: ViewerSort): void
{
    try {
        window.sessionStorage.setItem(VIEWER_SORT_SESSION_KEY, sort);
    } catch {
        // Ignore session-storage failures and fall back to URL-only behavior.
    }
}

export const viewerSortSession = {
    load,
    persist
};
// apply-patch-anchor - do not delete
