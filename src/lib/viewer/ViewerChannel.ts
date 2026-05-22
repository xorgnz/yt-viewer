export type ViewerChannelFields = {
    id: string | number;
    youtube_id: string;
    title: string;
};

export class ViewerChannel
{
    readonly id: string | number;
    readonly youtube_id: string;
    readonly title: string;

    constructor(fields: ViewerChannelFields)
    {
        this.id = fields.id;
        this.youtube_id = fields.youtube_id;
        this.title = fields.title;
    }
}
