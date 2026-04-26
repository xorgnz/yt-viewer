import type {
    ViewerVideoRecord,
    ViewerVideoReadRepository
} from '$lib/daos/readers/ViewerVideoReadRepository';

export class ViewerRecommendationService
{
    private readonly viewerVideoReadRepository: Pick<ViewerVideoReadRepository, 'list'>;
    private readonly profileId: number;

    constructor(
        viewerVideoReadRepository: Pick<ViewerVideoReadRepository, 'list'>,
        profileId: number
    )
    {
        this.viewerVideoReadRepository = viewerVideoReadRepository;
        this.profileId = profileId;
    }

    async load(currentVideo: ViewerVideoRecord, groupId: number | null, limit = 8): Promise<ViewerVideoRecord[]>
    {
        const candidates = await this.viewerVideoReadRepository.list({
            watched: 'all',
            ignored: 'hide',
            channelId: groupId == null ? currentVideo.channel_id : null,
            groupId,
            limit: 1000,
            offset: 0
        }, this.profileId);
        const recommendationSeed = ViewerRecommendationService.hashString([
            'recommend',
            String(this.profileId),
            String(groupId ?? currentVideo.channel_id),
            currentVideo.youtube_id
        ].join(':'));

        return candidates
            .filter((video) => video.id !== currentVideo.id)
            .map((video) => ({
                video,
                rank: ViewerRecommendationService.hashString(`${recommendationSeed}:${video.id}:${video.youtube_id}`)
            }))
            .sort((left, right) => {
                if (left.rank !== right.rank) {
                    return left.rank - right.rank;
                }

                return left.video.id - right.video.id;
            })
            .slice(0, Math.max(0, limit))
            .map((entry) => entry.video);
    }

    private static hashString(value: string): number
    {
        let hash = 2166136261;

        for (let index = 0; index < value.length; index += 1)
        {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }
}
// apply-patch-anchor - do not delete
