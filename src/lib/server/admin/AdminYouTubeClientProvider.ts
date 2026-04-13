import { YouTubeClient } from '$lib/youtube/youTubeClient';

export class AdminYouTubeClientProvider
{
    createClient(): YouTubeClient
    {
        return new YouTubeClient();
    }
}
