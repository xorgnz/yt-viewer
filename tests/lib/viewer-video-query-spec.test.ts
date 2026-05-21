import { describe, expect, it } from 'vitest';
import { ViewerVideoQuerySpec } from '$lib/daos/queries/ViewerVideoQuerySpec';
import {
    ViewerIgnoredFilter,
    ViewerSort,
    ViewerWatchedFilter
} from '$lib/viewer/types';

describe('ViewerVideoQuerySpec', () => {
    it('builds viewer list filters with virtual-channel joins and pagination', () => {
        const spec = new ViewerVideoQuerySpec({
            term: 'demo',
            dateFrom: 100,
            dateTo: 200,
            watched: ViewerWatchedFilter.Watched,
            ignored: ViewerIgnoredFilter.Hide,
            channelId: 'UC3',
            virtualChannelId: 'vc_queue',
            sort: ViewerSort.TitleAsc,
            limit: 5000,
            offset: -10
        }, 'default');

        const queryParts = spec.buildListQueryParts();

        expect(queryParts.groupJoin).toContain('virtual_channel_assignments');
        expect(queryParts.selectionJoin).toContain('virtual_channel_assignment_video_selections');
        expect(queryParts.whereSql).toContain('v.title LIKE :term');
        expect(queryParts.whereSql).toContain('v.published_at IS NOT NULL AND v.published_at >= :dateFrom');
        expect(queryParts.whereSql).toContain('v.published_at IS NOT NULL AND v.published_at <= :dateTo');
        expect(queryParts.whereSql).toContain('v.src_channel_id = :channelId');
        expect(queryParts.whereSql).toContain("ga.mode = 'selected_only'");
        expect(queryParts.whereSql).toContain('COALESCE(vf.watched, 0) = 1');
        expect(queryParts.whereSql).toContain('COALESCE(vf.ignored, 0) = 0');
        expect(queryParts.params).toEqual({
            profileId: 'default',
            term: '%demo%',
            dateFrom: 100,
            dateTo: 200,
            channelId: 'UC3',
            virtualChannelId: 'vc_queue'
        });
        expect(queryParts.limit).toBe(1000);
        expect(queryParts.offset).toBe(0);
        expect(spec.getOrderBySql()).toBe('LOWER(v.title) ASC, v.published_at IS NULL ASC, v.published_at DESC, v.video_id ASC');
    });

    it('defaults to hiding ignored videos without extra joins when no group filter is active', () => {
        const spec = new ViewerVideoQuerySpec({}, 'adult');

        const queryParts = spec.buildCountQueryParts();

        expect(queryParts.groupJoin).toBe('');
        expect(queryParts.selectionJoin).toBe('');
        expect(queryParts.whereSql).toBe('WHERE COALESCE(vf.ignored, 0) = 0');
        expect(queryParts.params).toEqual({
            profileId: 'adult'
        });
        expect(spec.getOrderBySql()).toBe('v.published_at IS NULL ASC, v.published_at DESC, v.video_id DESC');
    });
});
// apply-patch-anchor - do not delete
