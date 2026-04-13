import { describe, expect, it } from 'vitest';
import {
    HistorySessionReadQuerySpec,
    HistoryVideoSummaryReadQuerySpec
} from '$lib/daos/queries/HistoryReadQuerySpec';

describe('History read query specs', () => {
    it('builds shared session filters with bounded pagination', () => {
        const spec = new HistorySessionReadQuerySpec({
            profileId: 4,
            channelId: 9,
            dateFrom: 1000,
            dateTo: 2000,
            limit: 2005,
            offset: -2
        });

        const queryParts = spec.buildQueryParts();

        expect(queryParts.whereSql).toContain('h.profile_id = :profileId');
        expect(queryParts.whereSql).toContain('v.channel_id = :channelId');
        expect(queryParts.whereSql).toContain('h.session_started_at >= :dateFrom');
        expect(queryParts.whereSql).toContain('h.session_started_at <= :dateTo');
        expect(queryParts.params).toEqual({
            profileId: 4,
            channelId: 9,
            dateFrom: 1000,
            dateTo: 2000
        });
        expect(queryParts.limit).toBe(1000);
        expect(queryParts.offset).toBe(0);
    });

    it('defaults summary queries to an unrestricted where clause with standard pagination', () => {
        const spec = new HistoryVideoSummaryReadQuerySpec({});

        const queryParts = spec.buildQueryParts();

        expect(queryParts.whereSql).toBe('');
        expect(queryParts.params).toEqual({});
        expect(queryParts.limit).toBe(100);
        expect(queryParts.offset).toBe(0);
    });
});
