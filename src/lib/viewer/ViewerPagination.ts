export enum ViewerVisiblePageMarker
{
    Ellipsis = 'ellipsis'
}

export type ViewerVisiblePage = number | ViewerVisiblePageMarker;

export type ViewerPaginationState = {
    totalPages: number;
    currentPage: number;
    visiblePages: ViewerVisiblePage[];
};
