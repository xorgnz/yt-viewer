<script lang="ts">
    export let video: {
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

    export let filters: {
        term?: string;
        watched: 'all' | 'watched' | 'unwatched';
        ignored: 'hide' | 'show';
        dateFrom: number | null;
        dateTo: number | null;
        channelId: number | null;
        groupId: number | null;
        limit: number;
        offset: number;
    };

    function fmtDate(ms: number | null): string {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
        } catch { return ''; }
    }

    $: actionQuery = new URLSearchParams({
        term: filters.term || '',
        watched: filters.watched,
        ignored: filters.ignored,
        dateFrom: filters.dateFrom != null ? String(filters.dateFrom) : '',
        dateTo: filters.dateTo != null ? String(filters.dateTo) : '',
        channelId: filters.channelId != null ? String(filters.channelId) : '',
        groupId: filters.groupId != null ? String(filters.groupId) : '',
        limit: String(filters.limit),
        offset: String(filters.offset)
    }).toString();
</script>

<div class="card" title={video.title}>
    <a class="thumb" href={`/viewer/watch/${video.youtube_id}`} aria-label={`Open ${video.title}`}>
        {#if video.thumbnail_url}
            <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
        {:else}
            <div class="placeholder"></div>
        {/if}
        <div class="badges">
            {#if video.ignored}
                <span class="badge ignored">ignored</span>
            {/if}
            {#if video.favorite}
                <span class="badge favorite">★</span>
            {/if}
            {#if video.watched}
                <span class="badge watched">watched</span>
            {/if}
        </div>
    </a>
    <div class="meta">
        <a class="title" href={`/viewer/watch/${video.youtube_id}`}>{video.title}</a>
        <div class="chan">{video.channel_title}</div>
        <div class="pub">{fmtDate(video.published_at)}</div>
    </div>
    <div class="actions">
        <form method="POST" action={`?/toggleFlag&${actionQuery}`}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="kind" value="favorite" />
            <input type="hidden" name="value" value={video.favorite ? 0 : 1} />
            <button type="submit" class="icon favorite" class:active={!!video.favorite} aria-pressed={!!video.favorite} title={video.favorite ? 'Unfavorite' : 'Mark favorite'}>
                {video.favorite ? '★' : '☆'}
                <span class="sr-only">{video.favorite ? 'Unfavorite' : 'Mark favorite'}</span>
            </button>
        </form>
        <form method="POST" action={`?/toggleFlag&${actionQuery}`}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="kind" value="ignored" />
            <input type="hidden" name="value" value={video.ignored ? 0 : 1} />
            <button type="submit" class="icon ignored" class:active={!!video.ignored} aria-pressed={!!video.ignored} title={video.ignored ? 'Unignore' : 'Ignore video'}>
                {video.ignored ? '✓' : '⊖'}
                <span class="sr-only">{video.ignored ? 'Unignore' : 'Ignore video'}</span>
            </button>
        </form>
    </div>
</div>

<style>
    /* Dark theme for video cards */
    .card {
        display: flex;
        flex-direction: column;
        border: 1px solid #333;
        border-radius: 6px;
        overflow: hidden;
        color: #fff;
        background: #1e1e1e;
        position: relative;
    }
    .card a { color: inherit; text-decoration: none; }
    /* Floating actions in bottom-right */
    .actions {
        position: absolute;
        right: 8px;
        bottom: 8px;
        display: flex;
        gap: 8px;
        align-items: center;
        pointer-events: none; /* allow clicks only on buttons */
    }
    .actions form { display: inline; pointer-events: auto; }
    .actions button {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 1px solid #333;
        background: rgba(34,34,34,0.9);
        color: #fff;
        border-radius: 18px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transition: transform .1s ease, background .15s ease, border-color .15s ease;
        font-size: 1.05rem;
        line-height: 1;
    }
    .actions button:hover { background: rgba(54,54,54,0.95); transform: translateY(-1px); }
    .actions button.active.favorite { background: #e3b341; color: #161616; border-color: #c79c25; }
    .actions button.ignored.active { background: #b00020; border-color: #7a0015; color: #fff; }
    .actions button.icon { padding: 0; }
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
    }
    .thumb { position: relative; aspect-ratio: 16/9; background: #111; display: block; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb .placeholder { width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #2a2a2a, #2a2a2a 10px, #242424 10px, #242424 20px); }
    .badges { position: absolute; top: 4px; left: 4px; display: flex; gap: 4px; }
    .badge { padding: 2px 6px; font-size: .7rem; border-radius: 3px; background: rgba(0,0,0,.65); color: #fff; }
    .badge.favorite { background: #e3b341; color: #161616; }
    .badge.ignored { background: #999; }
    .badge.watched { background: #2e7d32; }
    .meta { padding: .65rem .65rem .25rem; }
    .title { display: -webkit-box; font-weight: 600; font-size: 1.05rem; margin-bottom: .35rem; overflow: hidden; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
    .chan { color: #bbb; font-size: .9rem; }
    .pub { color: #999; font-size: .85rem; }
</style>
