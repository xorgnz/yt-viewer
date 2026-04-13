type ViewerCardSelectionAction = 'none' | 'toggle' | 'toggleSingle' | 'selectRange';

function getViewerCardSelectionAction(
    event: MouseEvent | KeyboardEvent,
    isBusy: boolean
): ViewerCardSelectionAction
{
    if (isBusy) {
        return 'none';
    }

    if (event instanceof KeyboardEvent) {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return 'none';
        }

        return 'toggle';
    }

    if (event.defaultPrevented) {
        return 'none';
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, form')) {
        return 'none';
    }

    if (event.shiftKey) {
        return 'selectRange';
    }

    if (!event.ctrlKey && !event.metaKey) {
        return 'toggleSingle';
    }

    return 'toggle';
}

function shouldPreventViewerCardMouseDown(event: MouseEvent, isBusy: boolean): boolean
{
    if (isBusy) {
        return false;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, form')) {
        return false;
    }

    return event.shiftKey || event.ctrlKey || event.metaKey;
}

function shouldClearViewerSelectionFromBackground(
    event: MouseEvent,
    hasActiveSelection: boolean,
    isBusy: boolean
): boolean
{
    if (
        isBusy ||
        !hasActiveSelection ||
        event.defaultPrevented ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey
    ) {
        return false;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
        return false;
    }

    return !target.closest('.card, .bulk-action-bar, .pager, .panel');
}

export const viewerSelectionInteractions = {
    getViewerCardSelectionAction,
    shouldPreventViewerCardMouseDown,
    shouldClearViewerSelectionFromBackground
};
