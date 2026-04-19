import { describe, expect, it } from 'vitest';
import { ViewerVideoDisplayPresenter } from '../../src/lib/viewer/display';
import type { ViewerVideo } from '../../src/lib/viewer/types';

describe('ViewerVideoDisplayPresenter', () => {
    function createVideo(overrides: Partial<ViewerVideo> = {}): ViewerVideo
    {
        return {
            id: 1,
            youtube_id: 'abc123',
            channel_id: 10,
            title: 'Sample Video',
            description: 'Sample Description',
            published_at: Date.UTC(2026, 3, 10),
            duration_seconds: 120,
            thumbnail_url: 'https://example.test/thumb.jpg',
            channel_title: 'Channel',
            channel_youtube_id: 'chan123',
            watched: 0,
            favorite: 0,
            ignored: 0,
            ...overrides
        };
    }

    it('builds display state for a favorite watched video', () => {
        const presenter = new ViewerVideoDisplayPresenter(createVideo({
            watched: 1,
            favorite: 1
        }));

        expect(presenter.getState()).toEqual({
            isIgnored: false,
            isFavorite: true,
            isWatched: true,
            isFavoriteWatched: true,
            isFavoriteOnly: false,
            isWatchedOnly: false,
            publishedDate: '2026-04-10',
            watchHref: '/viewer/watch/abc123',
            openLabel: 'Open Sample Video'
        });
    });

    it('derives toggle metadata from current flag state', () => {
        const presenter = new ViewerVideoDisplayPresenter(createVideo({
            watched: 1,
            ignored: 1
        }));

        expect(presenter.getNextFlagValue('watched')).toBe(0);
        expect(presenter.getNextFlagValue('favorite')).toBe(1);
        expect(presenter.getToggleTitle('watched')).toBe('Mark unwatched');
        expect(presenter.getToggleTitle('favorite')).toBe('Mark favorite');
        expect(presenter.getToggleLabel('ignored')).toBe('Unignore');
    });

    it('returns an empty date when published_at is missing', () => {
        const presenter = new ViewerVideoDisplayPresenter(createVideo({
            published_at: null
        }));

        expect(presenter.getState().publishedDate).toBe('');
    });
});
// apply-patch-anchor - do not delete