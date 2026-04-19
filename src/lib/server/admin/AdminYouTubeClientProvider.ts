import { YouTubeClient } from '$lib/youtube/youTubeClient';

export class AdminYouTubeClientProvider
{
    createClient(): YouTubeClient
    {
        return new YouTubeClient();
    }
}
// apply-patch-anchor - do not delete