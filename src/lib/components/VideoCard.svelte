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
    export let isSelected = false;
    export let onCardClick: ((event: MouseEvent | KeyboardEvent, videoId: number) => void) | null = null;
    export let onCardMouseDown: ((event: MouseEvent, videoId: number) => void) | null = null;

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

    $: isIgnored = !!video.ignored;
    $: isFavorite = !!video.favorite;
    $: isWatched = !!video.watched;
    $: isFavoriteWatched = !isIgnored && isFavorite && isWatched;
    $: isFavoriteOnly = !isIgnored && isFavorite && !isWatched;
    $: isWatchedOnly = !isIgnored && isWatched && !isFavorite;
</script>

<div
    class="card"
    class:card-ignored={isIgnored}
    class:card-favorite-watched={isFavoriteWatched}
    class:card-favorite={isFavoriteOnly}
    class:card-watched={isWatchedOnly}
    class:card-selected={isSelected}
    data-selected={isSelected ? '1' : '0'}
    role="button"
    tabindex="0"
    aria-pressed={isSelected}
    on:mousedown={(event) => onCardMouseDown?.(event, video.id)}
    on:click={(event) => onCardClick?.(event, video.id)}
    on:keydown={(event) => onCardClick?.(event, video.id)}
    title={video.title}
>
    <a class="thumb" href={`/viewer/watch/${video.youtube_id}`} aria-label={`Open ${video.title}`}>
        {#if isSelected}
            <span class="selection-indicator" aria-hidden="true">✓</span>
        {/if}
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
            <input type="hidden" name="kind" value="watched" />
            <input type="hidden" name="value" value={video.watched ? 0 : 1} />
            <button type="submit" class="icon watched" class:active={!!video.watched} aria-pressed={!!video.watched} title={video.watched ? 'Mark unwatched' : 'Mark watched'}>
                {#if video.watched}
                    &#10003;
                {:else}
                    &#9675;
                {/if}
                <span class="sr-only">{video.watched ? 'Mark unwatched' : 'Mark watched'}</span>
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
        background:
            linear-gradient(180deg, rgba(36, 36, 36, 0.96), rgba(24, 24, 24, 0.98));
        position: relative;
        transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .card.card-watched {
        border-color: rgba(67, 160, 71, 0.7);
        background:
            linear-gradient(180deg, rgba(28, 58, 34, 0.96), rgba(18, 34, 22, 0.98));
        box-shadow: inset 0 1px 0 rgba(129, 199, 132, 0.14);
    }
    .card.card-favorite {
        border-color: rgba(227, 179, 65, 0.75);
        background:
            linear-gradient(180deg, rgba(64, 51, 18, 0.96), rgba(35, 28, 11, 0.98));
        box-shadow: inset 0 1px 0 rgba(255, 224, 130, 0.18);
    }
    .card.card-favorite-watched {
        border-color: rgba(171, 198, 79, 0.78);
        background:
            linear-gradient(135deg, rgba(78, 63, 18, 0.96), rgba(28, 58, 34, 0.98));
        box-shadow: inset 0 1px 0 rgba(212, 225, 87, 0.16);
    }
    .card.card-ignored {
        border-color: rgba(229, 115, 115, 0.78);
        background:
            linear-gradient(180deg, rgba(78, 24, 30, 0.97), rgba(40, 14, 18, 0.99));
        box-shadow: inset 0 1px 0 rgba(239, 154, 154, 0.16);
    }
    .card.card-selected {
        border-color: #3b82f6;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }
    .card.card-selected.card-watched {
        border-color: #4fba7a;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }
    .card.card-selected.card-favorite {
        border-color: #69a9f5;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }
    .card.card-selected.card-favorite-watched {
        border-color: #72b8d0;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(59, 130, 246, 0.35);
    }
    .card.card-selected.card-ignored {
        border-color: rgba(229, 115, 115, 0.9);
        box-shadow:
            inset 0 1px 0 rgba(239, 154, 154, 0.16),
            0 0 0 3px rgba(59, 130, 246, 0.35);
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
    .actions button.watched.active { background: #2e7d32; border-color: #1f5a23; color: #f4fff4; }
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
    .selection-indicator {
        position: absolute;
        top: 0.55rem;
        right: 0.55rem;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.9rem;
        height: 1.9rem;
        border: 2px solid rgba(186, 230, 253, 0.95);
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(59, 130, 246, 0.98), rgba(29, 78, 216, 0.98));
        color: #eff6ff;
        font-size: 1rem;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 0.35rem 0.9rem rgba(8, 47, 73, 0.45);
    }
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
