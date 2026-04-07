<script lang="ts">
    export let data: {
        filters: {
            profileKey: string;
            mode: 'sessions' | 'videos';
            channelId: number | null;
            dateFrom: number | null;
            dateTo: number | null;
            limit: number;
            offset: number;
        };
        items: Array<
            {
                session_started_at: number;
                last_updated_at: number;
                time_watched_seconds: number;
                profile_id: number;
                video_id: number;
                youtube_id: string;
                title: string;
                channel_id: number;
                channel_title: string;
            } |
            {
                profile_id: number;
                video_id: number;
                youtube_id: string;
                title: string;
                channel_id: number;
                channel_title: string;
                total_time_watched_seconds: number;
                session_count: number;
                latest_session_started_at: number;
                latest_last_updated_at: number;
            }
        >;
        sessionItems: Array<{
            session_started_at: number;
            last_updated_at: number;
            time_watched_seconds: number;
            profile_id: number;
            video_id: number;
            youtube_id: string;
            title: string;
            channel_id: number;
            channel_title: string;
        }>;
        channels: Array<{ id: number; youtube_id: string; title: string }>;
        profileId: number;
        profileName: string;
    };

    const f = data.filters;

    function fmtDate(ms: number): string
    {
        try {
            const d = new Date(ms);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
        } catch {
            return '';
        }
    }

    function humanDate(ms: number | null): string
    {
        if (!ms) return '';
        try {
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
        } catch { return ''; }
    }

    function fmtDuration(totalSeconds: number): string
    {
        const seconds = Math.max(0, Math.floor(totalSeconds || 0));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    function nextOffset(): number { return f.offset + f.limit; }
    function prevOffset(): number { return Math.max(0, f.offset - f.limit); }

    function queryWithOffset(offset: number): string
    {
        return new URLSearchParams({
            mode: f.mode,
            channelId: f.channelId != null ? String(f.channelId) : '',
            dateFrom: f.dateFrom != null ? String(f.dateFrom) : '',
            dateTo: f.dateTo != null ? String(f.dateTo) : '',
            limit: String(f.limit),
            offset: String(offset)
        }).toString();
    }

    function sessionsForVideo(videoId: number)
    {
        return data.sessionItems.filter((it) => it.video_id === videoId);
    }
</script>

<div class="page stack">
    <section class="panel">
        <h1>History</h1>
        <details class="help-box">
            <summary>How history works</summary>
            <div class="help-copy">
                <p>History sessions are created after more than 5 seconds of active watch time.</p>
                <p>While playback continues, the current session is updated about every 10 seconds.</p>
                <p>If you resume the same video within 5 minutes of the last history update, the same session is reused. Longer gaps start a new session.</p>
                <p>Time watched reflects time spent actively watching, including replays, not the furthest timestamp reached.</p>
                <p>The watched flag is separate from history. A video can appear in history without being marked watched, and manual watched toggles do not create history rows.</p>
            </div>
        </details>
        <form method="GET" class="fields">
            <div>
                <div class="muted">Active Profile</div>
                <div>{data.profileName}</div>
            </div>
            <label>View
                <select name="mode" value={f.mode}>
                    <option value="sessions" selected={f.mode === 'sessions'}>Sessions</option>
                    <option value="videos" selected={f.mode === 'videos'}>By video</option>
                </select>
            </label>
            <label>Channel
                <select name="channelId" value={f.channelId ?? ''}>
                    <option value="">Any</option>
                    {#each data.channels as ch}
                        <option value={ch.id} selected={f.channelId === ch.id}>{ch.title}</option>
                    {/each}
                </select>
            </label>
            <label>Date from (ms)
                <input type="number" name="dateFrom" value={f.dateFrom ?? ''} />
            </label>
            <label>Date to (ms)
                <input type="number" name="dateTo" value={f.dateTo ?? ''} />
            </label>
            <label>Per page
                <input type="number" name="limit" min="1" max="1000" value={f.limit} />
            </label>
            <input type="hidden" name="offset" value={f.offset} />
            <div class="inline-actions">
                <button type="submit">Apply</button>
            </div>
        </form>
    </section>

    <section class="stack">
        <div class="toolbar">
            <div>{data.items.length} items</div>
            <div class="pager">
                <a class="btn btn-secondary" rel="prev" href={`?${queryWithOffset(prevOffset())}`}>Prev</a>
                <a class="btn btn-secondary" rel="next" href={`?${queryWithOffset(nextOffset())}`}>Next</a>
            </div>
            <div class="hint">Date filter: {humanDate(f.dateFrom)} - {humanDate(f.dateTo)}</div>
            <div class="spacer"></div>
        </div>

        {#if data.items.length === 0}
            <p class="muted">No history items match these filters.</p>
        {:else}
            <div class="table-wrap">
                {#if f.mode === 'videos'}
                    <div class="video-summary-list">
                        {#each data.items as it}
                            <details class="video-summary">
                                <summary>
                                    <span class="summary-title">{it.title}</span>
                                    <span class="summary-meta">{it.channel_title}</span>
                                    <span class="summary-meta">{(it as any).session_count} sessions</span>
                                    <span class="summary-meta">{fmtDuration((it as any).total_time_watched_seconds)}</span>
                                    <span class="summary-meta">Latest {fmtDate((it as any).latest_session_started_at)}</span>
                                </summary>
                                <div class="summary-links inline-actions">
                                    <a class="btn btn-secondary" href={`/viewer/watch/${it.youtube_id}`} title="Open watch page">Watch</a>
                                    <a class="btn btn-secondary" href={`/viewer?channelId=${it.channel_id}`} title="More from channel">Channel</a>
                                    <a class="btn btn-secondary" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${it.youtube_id}`} title="Open on YouTube">YouTube</a>
                                </div>
                                <table class="history nested-history">
                                    <thead>
                                        <tr>
                                            <th class="col-time">Session start</th>
                                            <th class="col-meta">Last updated</th>
                                            <th class="col-meta">Time watched</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each sessionsForVideo(it.video_id) as session}
                                            <tr>
                                                <td class="col-time">{fmtDate(session.session_started_at)}</td>
                                                <td class="col-meta">{fmtDate(session.last_updated_at)}</td>
                                                <td class="col-meta">{fmtDuration(session.time_watched_seconds)}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </details>
                        {/each}
                    </div>
                {:else}
                    <table class="history">
                        <thead>
                            <tr>
                                <th class="col-time">Session start</th>
                                <th class="col-title">Title</th>
                                <th class="col-chan">Channel</th>
                                <th class="col-meta">Last updated</th>
                                <th class="col-meta">Time watched</th>
                                <th class="col-actions">Links</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.items as it}
                                <tr>
                                    <td class="col-time">{fmtDate((it as any).session_started_at)}</td>
                                    <td class="col-title">{it.title}</td>
                                    <td class="col-chan">{it.channel_title}</td>
                                    <td class="col-meta">{fmtDate((it as any).last_updated_at)}</td>
                                    <td class="col-meta">{fmtDuration((it as any).time_watched_seconds)}</td>
                                    <td class="col-actions">
                                        <div class="inline-actions">
                                            <a class="btn btn-secondary" href={`/viewer/watch/${it.youtube_id}`} title="Open watch page">Watch</a>
                                            <a class="btn btn-secondary" href={`/viewer?channelId=${it.channel_id}`} title="More from channel">Channel</a>
                                            <a class="btn btn-secondary" target="_blank" rel="noopener" href={`https://www.youtube.com/watch?v=${it.youtube_id}`} title="Open on YouTube">YouTube</a>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
        {/if}
    </section>
</div>

<style>
    .col-time {
        white-space: nowrap;
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .col-title {
        font-weight: 500;
    }

    .col-chan {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .col-actions {
        white-space: nowrap;
    }

    .col-meta {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .video-summary-list {
        display: grid;
        gap: 0.75rem;
    }

    .video-summary {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
        padding: 0.75rem 1rem;
    }

    .video-summary summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        cursor: pointer;
        align-items: center;
    }

    .summary-title {
        font-weight: 600;
    }

    .summary-meta {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .summary-links {
        margin: 0.75rem 0;
    }

    .nested-history {
        margin-top: 0.5rem;
    }

    .help-box {
        margin-bottom: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
        padding: 0.75rem 1rem;
    }

    .help-box summary {
        cursor: pointer;
        font-weight: 600;
    }

    .help-copy {
        margin-top: 0.75rem;
        color: var(--text-muted);
    }

    .help-copy p {
        margin: 0 0 0.5rem 0;
    }
</style>
