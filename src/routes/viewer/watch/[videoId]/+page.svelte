<script lang="ts">
    export let data: {
        video: {
            id: number;
            youtube_id: string;
            channel_id: number;
            title: string;
            description: string;
            published_at: number | null;
            duration_seconds: number | null;
            thumbnail_url: string | null;
            channel_title: string;
            channel_youtube_id: string;
            watched: number;
            favorite: number;
            ignored: number;
        };
        profileId: number;
    };

    function formatDate(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toLocaleString();
        } catch {
            return '';
        }
    }
</script>

<a class="back" href="/viewer">← Back to viewer</a>

<h1 class="title">{data.video.title}</h1>
<div class="meta">
    <span class="channel">{data.video.channel_title}</span>
    {#if data.video.published_at}
        <span class="dot">•</span>
        <span class="date">{formatDate(data.video.published_at)}</span>
    {/if}
    <span class="badges">
        {#if data.video.favorite}
            <span class="badge favorite">★ Favorite</span>
        {/if}
        {#if data.video.watched}
            <span class="badge watched">Watched</span>
        {/if}
        {#if data.video.ignored}
            <span class="badge ignored">Ignored</span>
        {/if}
    </span>
    <span class="dot">•</span>
    <a class="channel-link" href={`/viewer?channelId=${data.video.channel_id}`}>More from this channel</a>
    <span class="dot">•</span>
    <a class="yt-link" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${data.video.youtube_id}`}>Open on YouTube</a>
    
</div>

<div class="player-wrap">
    <iframe
        class="player"
        title={data.video.title}
        src={`https://www.youtube.com/embed/${data.video.youtube_id}?autoplay=0&rel=0&modestbranding=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
    ></iframe>
</div>

{#if data.video.description}
<details class="desc">
    <summary>Description</summary>
    <pre>{data.video.description}</pre>
    </details>
{/if}

<style>
    .back { display: inline-block; margin: .5rem 0 1rem; text-decoration: none; }
    .title { margin: 0.25rem 0 0.5rem; font-size: 1.25rem; }
    .meta { color: #555; font-size: 0.9rem; display: flex; align-items: center; flex-wrap: wrap; gap: .25rem .5rem; }
    .dot { opacity: .5; }
    .badge { border-radius: 3px; padding: 0 .25rem; font-size: .8rem; border: 1px solid #ddd; }
    .badge.favorite { color: #c37a00; border-color: #ffd27a; background: #fff7e0; }
    .badge.watched { color: #0a7a00; border-color: #9ce19c; background: #eefaea; }
    .badge.ignored { color: #666; border-color: #ccc; background: #f4f4f4; }
    .player-wrap { position: relative; width: 100%; max-width: 960px; aspect-ratio: 16 / 9; margin: 1rem 0; }
    .player { width: 100%; height: 100%; border: none; border-radius: 8px; box-shadow: 0 1px 6px rgba(0,0,0,.12); }
    .desc summary { cursor: pointer; }
    .desc pre { white-space: pre-wrap; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; font-size: .95rem; }
</style>
