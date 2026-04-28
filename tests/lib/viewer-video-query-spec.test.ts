import { describe, expect, it } from 'vitest';
import { ViewerVideoQuerySpec } from '$lib/daos/queries/ViewerVideoQuerySpec';

describe('ViewerVideoQuerySpec', () => {
    it('builds viewer list filters with virtual-channel joins and pagination', () => {
        const spec = new ViewerVideoQuerySpec({
            term: 'demo',
            dateFrom: 100,
            dateTo: 200,
            watched: 'watched',
            ignored: 'hide',
            channelId: 3,
            groupId: 8,
            sort: 'title_asc',
            limit: 5000,
            offset: -10
        }, 12);

        const queryParts = spec.buildListQueryParts();

        expect(queryParts.groupJoin).toContain('virtual_channel_assignments');
        expect(queryParts.selectionJoin).toContain('virtual_channel_assignment_video_selections');
        expect(queryParts.whereSql).toContain('v.title LIKE :term');
        expect(queryParts.whereSql).toContain('v.published_at IS NOT NULL AND v.published_at >= :dateFrom');
        expect(queryParts.whereSql).toContain('v.published_at IS NOT NULL AND v.published_at <= :dateTo');
        expect(queryParts.whereSql).toContain('v.channel_id = :channelId');
        expect(queryParts.whereSql).toContain("ga.mode = 'selected_only'");
        expect(queryParts.whereSql).toContain('COALESCE(vf.watched, 0) = 1');
        expect(queryParts.whereSql).toContain('COALESCE(vf.ignored, 0) = 0');
        expect(queryParts.params).toEqual({
            profileId: 12,
            term: '%demo%',
            dateFrom: 100,
            dateTo: 200,
            channelId: 3,
            groupId: 8
        });
        expect(queryParts.limit).toBe(1000);
        expect(queryParts.offset).toBe(0);
        expect(spec.getOrderBySql()).toBe('LOWER(v.title) ASC, v.published_at IS NULL ASC, v.published_at DESC, v.id ASC');
    });

    it('defaults to hiding ignored videos without extra joins when no group filter is active', () => {
        const spec = new ViewerVideoQuerySpec({}, 7);

        const queryParts = spec.buildCountQueryParts();

        expect(queryParts.groupJoin).toBe('');
        expect(queryParts.selectionJoin).toBe('');
        expect(queryParts.whereSql).toBe('WHERE COALESCE(vf.ignored, 0) = 0');
        expect(queryParts.params).toEqual({
            profileId: 7
        });
        expect(spec.getOrderBySql()).toBe('v.published_at IS NULL ASC, v.published_at DESC, v.id DESC');
    });
});
// apply-patch-anchor - do not delete
