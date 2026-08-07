import { describe, expect, it } from 'vitest';
import { Video, VideoLengthClassification } from '../../src/lib/entities/video';
import { ViewerVideoDisplayPresenter } from '../../src/lib/viewer/display';
import { ViewerSelectionFlagKind } from '../../src/lib/viewer/selection/types';

describe('ViewerVideoDisplayPresenter', () => {
    function createVideo(overrides: Partial<Video> = {}): Video
    {
        return new Video({
            id: 'abc123',
            channel_id: 10,
            title: 'Sample Video',
            description: 'Sample Description',
            published_at: Date.UTC(2026, 3, 10),
            duration_seconds: 120,
            thumbnail_url: 'https://example.test/thumb.jpg',
            length_classification: VideoLengthClassification.Short,
            channel_title: 'Channel',
            watched: 0,
            favorite: 0,
            ignored: 0,
            ...overrides
        });
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
            duration: '2:00',
            watchHref: '/viewer/watch/abc123',
            openLabel: 'Open Sample Video'
        });
    });

    it('derives toggle metadata from current flag state', () => {
        const presenter = new ViewerVideoDisplayPresenter(createVideo({
            watched: 1,
            ignored: 1
        }));

        expect(presenter.getNextFlagValue(ViewerSelectionFlagKind.Watched)).toBe(0);
        expect(presenter.getNextFlagValue(ViewerSelectionFlagKind.Favorite)).toBe(1);
        expect(presenter.getToggleTitle(ViewerSelectionFlagKind.Watched)).toBe('Mark unwatched');
        expect(presenter.getToggleTitle(ViewerSelectionFlagKind.Favorite)).toBe('Mark favorite');
        expect(presenter.getToggleLabel(ViewerSelectionFlagKind.Ignored)).toBe('Unignore');
    });

    it('returns an empty date when published_at is missing', () => {
        const presenter = new ViewerVideoDisplayPresenter(createVideo({
            published_at: null
        }));

        expect(presenter.getState().publishedDate).toBe('');
    });

    it('formats display duration when video duration is available', () => {
        const shortPresenter = new ViewerVideoDisplayPresenter(createVideo({
            duration_seconds: 65
        }));
        const longPresenter = new ViewerVideoDisplayPresenter(createVideo({
            duration_seconds: 7384
        }));
        const unknownPresenter = new ViewerVideoDisplayPresenter(createVideo({
            duration_seconds: null
        }));

        expect(shortPresenter.getState().duration).toBe('1:05');
        expect(longPresenter.getState().duration).toBe('2:03:04');
        expect(unknownPresenter.getState().duration).toBe('');
    });
});
// apply-patch-anchor - do not delete
