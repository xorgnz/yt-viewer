import { describe, expect, it } from 'vitest';
import { ViewerQueryParser } from '../../src/lib/server/viewer/ViewerQueryParser';

describe('ViewerQueryParser', () => {
    it('defaults child profiles to unwatched and preserves empty query inputs', () => {
        const filters = ViewerQueryParser.parse(
            new URL('http://localhost/viewer'),
            'child'
        );

        expect(filters).toMatchObject({
            watched: 'unwatched',
            ignored: 'hide',
            dateFromInput: '',
            dateToInput: '',
            channelId: null,
            groupId: null,
            limit: 200,
            offset: 0
        });
    });

    it('normalizes legacy ignored and watched query parameters', () => {
        const filters = ViewerQueryParser.parse(
            new URL('http://localhost/viewer?watched=watched&showIgnored=1'),
            'default'
        );

        expect(filters.watched).toBe('watched');
        expect(filters.ignored).toBe('show');
    });

    it('parses date boundaries and numeric filters from the query string', () => {
        const filters = ViewerQueryParser.parse(
            new URL('http://localhost/viewer?dateFrom=2026-04-01&dateTo=2026-04-02&channelId=3&groupId=8&limit=25&offset=50'),
            'default'
        );

        expect(filters.dateFrom).toBe(new Date(2026, 3, 1, 0, 0, 0, 0).getTime());
        expect(filters.dateTo).toBe(new Date(2026, 3, 2, 23, 59, 59, 999).getTime());
        expect(filters.channelId).toBe(3);
        expect(filters.groupId).toBe(8);
        expect(filters.limit).toBe(25);
        expect(filters.offset).toBe(50);
    });

    it('falls back to all when watched is unsupported and leaves invalid numbers as NaN-compatible output', () => {
        const filters = ViewerQueryParser.parse(
            new URL('http://localhost/viewer?watched=maybe&channelId=nope&limit=bad'),
            'default'
        );

        expect(filters.watched).toBe('all');
        expect(Number.isNaN(filters.channelId)).toBe(true);
        expect(Number.isNaN(filters.limit)).toBe(true);
    });
});
// apply-patch-anchor - do not delete