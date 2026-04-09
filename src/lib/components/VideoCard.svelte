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
            <span class="selection-indicator" aria-hidden="true">&#10003;</span>
        {/if}
        {#if video.thumbnail_url}
            <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
        {:else}
            <div class="placeholder"></div>
        {/if}
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
                <span class="icon-glyph" aria-hidden="true">&#9733;</span>
                <span class="sr-only">{video.favorite ? 'Unfavorite' : 'Mark favorite'}</span>
            </button>
        </form>
        <form method="POST" action={`?/toggleFlag&${actionQuery}`}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="kind" value="watched" />
            <input type="hidden" name="value" value={video.watched ? 0 : 1} />
            <button type="submit" class="icon watched" class:active={!!video.watched} aria-pressed={!!video.watched} title={video.watched ? 'Mark unwatched' : 'Mark watched'}>
                <span class="icon-glyph" aria-hidden="true">&#10003;</span>
                <span class="sr-only">{video.watched ? 'Mark unwatched' : 'Mark watched'}</span>
            </button>
        </form>
        <form method="POST" action={`?/toggleFlag&${actionQuery}`}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="kind" value="ignored" />
            <input type="hidden" name="value" value={video.ignored ? 0 : 1} />
            <button type="submit" class="icon ignored" class:active={!!video.ignored} aria-pressed={!!video.ignored} title={video.ignored ? 'Unignore' : 'Ignore video'}>
                <span class="icon-glyph" aria-hidden="true">&#10005;</span>
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
        width: 1.9rem;
        height: 1.9rem;
        min-width: 1.9rem;
        min-height: 1.9rem;
        padding: 0;
        gap: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(184, 184, 184, 0.75);
        background: linear-gradient(180deg, rgba(46, 46, 46, 0.96), rgba(24, 24, 24, 0.98));
        color: rgba(132, 138, 146, 0.82);
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 0.3rem 0.75rem rgba(0, 0, 0, 0.38);
        transition: transform .1s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
        font-size: 0.98rem;
        font-weight: 800;
        line-height: 1;
    }
    .actions button .icon-glyph {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1em;
        height: 1em;
        line-height: 1;
        flex: 0 0 auto;
        transform: translateY(-1px);
    }
    .actions button:hover {
        background: linear-gradient(180deg, rgba(68, 68, 68, 0.98), rgba(34, 34, 34, 0.98));
        border-color: rgba(214, 214, 214, 0.8);
        transform: translateY(-1px);
        box-shadow: 0 0.4rem 0.95rem rgba(0, 0, 0, 0.42);
    }
    .actions button.active.favorite {
        background: linear-gradient(180deg, rgba(227, 179, 65, 0.98), rgba(199, 156, 37, 0.98));
        color: #161616;
        border-color: rgba(255, 232, 162, 0.95);
        box-shadow: 0 0.35rem 0.9rem rgba(106, 76, 6, 0.38);
    }
    .actions button.watched.active {
        background: linear-gradient(180deg, rgba(46, 125, 50, 0.98), rgba(31, 90, 35, 0.98));
        border-color: rgba(180, 234, 185, 0.92);
        color: #f4fff4;
        box-shadow: 0 0.35rem 0.9rem rgba(12, 57, 23, 0.4);
    }
    .actions button.ignored.active {
        background: linear-gradient(180deg, rgba(176, 0, 32, 0.98), rgba(122, 0, 21, 0.98));
        border-color: rgba(255, 190, 198, 0.92);
        color: #fff;
        box-shadow: 0 0.35rem 0.9rem rgba(72, 0, 13, 0.42);
    }
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
    .meta { padding: .65rem .65rem .25rem; }
    .title { display: -webkit-box; font-weight: 600; font-size: 1.05rem; margin-bottom: .35rem; overflow: hidden; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
    .chan { color: #bbb; font-size: .9rem; }
    .pub { color: #999; font-size: .85rem; }
</style>

