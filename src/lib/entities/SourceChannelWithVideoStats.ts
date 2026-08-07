import {
    SourceChannel,
    type SourceChannelSFO
} from '$lib/entities/sourceChannel';

export interface SourceChannelWithVideoStatsFields
{
    sourceChannel: SourceChannel;
    videoCount: number;
    virtualChannelCount: number;
    watchedCount: number;
    favoriteCount: number;
    ignoredCount: number;
}

export interface SourceChannelWithVideoStatsSFO
{
    sourceChannel: SourceChannelSFO;
    videoCount: number;
    virtualChannelCount: number;
    watchedCount: number;
    favoriteCount: number;
    ignoredCount: number;
}

export class SourceChannelWithVideoStats
{
    readonly sourceChannel: SourceChannel;
    readonly videoCount: number;
    readonly virtualChannelCount: number;
    readonly watchedCount: number;
    readonly favoriteCount: number;
    readonly ignoredCount: number;

    public constructor(fields: SourceChannelWithVideoStatsFields)
    {
        this.sourceChannel = fields.sourceChannel;
        this.videoCount = fields.videoCount;
        this.virtualChannelCount = fields.virtualChannelCount;
        this.watchedCount = fields.watchedCount;
        this.favoriteCount = fields.favoriteCount;
        this.ignoredCount = fields.ignoredCount;
    }

    public serialize(): SourceChannelWithVideoStatsSFO
    {
        return {
            sourceChannel: this.sourceChannel.serialize(),
            videoCount: this.videoCount,
            virtualChannelCount: this.virtualChannelCount,
            watchedCount: this.watchedCount,
            favoriteCount: this.favoriteCount,
            ignoredCount: this.ignoredCount
        };
    }

    public static deserialize(serialFormObject: SourceChannelWithVideoStatsSFO): SourceChannelWithVideoStats
    {
        return new SourceChannelWithVideoStats({
            sourceChannel: SourceChannel.deserialize(serialFormObject.sourceChannel),
            videoCount: serialFormObject.videoCount,
            virtualChannelCount: serialFormObject.virtualChannelCount,
            watchedCount: serialFormObject.watchedCount,
            favoriteCount: serialFormObject.favoriteCount,
            ignoredCount: serialFormObject.ignoredCount
        });
    }
}
// apply-patch-anchor - do not delete
